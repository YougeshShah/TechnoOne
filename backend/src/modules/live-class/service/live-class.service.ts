import { randomBytes } from "crypto";
import { AppError } from "../../../common/errors/AppError";
import { liveClassRepository } from "../repository/live-class.repository";
import { courseService } from "../../course/service/course.service";
import { CreateLiveClassInput, ListLiveClassesQuery } from "../dto/live-class.dto";
import { lawFirmRepository } from "../../lawfirm/repository/lawfirm.repository";
import { prisma } from "../../../database/prisma";
import { notificationRepository } from "../../notification/repository/notification.repository";

// Free public Jitsi Meet server — no API key, no per-minute cost. Self-hosting
// is a drop-in swap later (just change this base URL) if usage outgrows what
// the public instance comfortably handles.
const JITSI_BASE_URL = "https://meet.jit.si";

function generateRoomName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const uniqueSuffix = randomBytes(4).toString("hex");
  return `technoone-${slug}-${uniqueSuffix}`;
}

// Institution staff (admin, teacher, or general staff) may only manage a
// class hosted by their OWN institution. Company staff can manage any class.
function assertCanManage(liveClass: any, auth: { accountType: string; lawFirmId: string | null }) {
  if (auth.accountType === "COMPANY") return;
  if (liveClass.hostLawFirmId && liveClass.hostLawFirmId === auth.lawFirmId) return;
  throw AppError.forbidden("You don't have access to manage this class.");
}

export const liveClassService = {
  async list(query: ListLiveClassesQuery, opts: { studentLawFirmId?: string | null; forLawFirmId?: string; onlyHostId?: string } = {}) {
    return liveClassRepository.findMany({
      courseId: query.courseId,
      upcomingOnly: query.upcomingOnly,
      studentLawFirmId: opts.studentLawFirmId,
      forLawFirmId: opts.forLawFirmId,
      onlyHostId: opts.onlyHostId,
    });
  },

  async getById(id: string, studentId?: string | null) {
    const liveClass: any = await liveClassRepository.findById(id);
    if (!liveClass) throw AppError.notFound("Live class not found");

    if (studentId && liveClass.recordingUrl) {
      const allowed = await courseService.canAccess(studentId, liveClass.courseId, liveClass.isFreeDemo);
      if (!allowed) {
        return { ...liveClass, recordingUrl: null };
      }
    }
    return liveClass;
  },

  async create(input: CreateLiveClassInput, creatorId: string, hostLawFirmId?: string) {
    // Same "Sector Access" check as Mock Test/Flashcard/MCQ/Library -- an
    // institution can only schedule classes for courses Company granted it.
    if (hostLawFirmId) {
      const firm = await lawFirmRepository.findById(hostLawFirmId);
      const allowed = (firm as any)?.allowedCourseIds ?? [];
      if (allowed.length > 0 && !allowed.includes(input.courseId)) {
        throw AppError.forbidden("Your institution doesn't have Sector Access to this course.");
      }
    }
    const jitsiRoomName = generateRoomName(input.title);
    // If the creator explicitly picked a teacher/staff to host it,
    // that person hosts -- otherwise the creator hosts it themselves,
    // same behavior as before hostId existed.
    const hostId = input.hostId || creatorId;
    const liveClass = await liveClassRepository.create({
      courseId: input.courseId,
      subjectId: input.subjectId,
      title: input.title,
      description: input.description,
      hostId,
      jitsiRoomName,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      isFreeDemo: input.isFreeDemo,
      hostLawFirmId,
    });

    // Record the full host list -- the primary host always gets an entry
    // (isPrimary: true) alongside any additional co-hosts, so
    // liveClass.cohosts is always the complete picture, not just the extras.
    const allHostIds = [hostId, ...(input.cohostIds ?? []).filter((id) => id !== hostId)];
    await liveClassRepository.setCohosts(liveClass.id, hostId, allHostIds);

    // Notify every student at this institution that a new class was
    // scheduled -- includes the actual date/time so the notification is
    // useful on its own, not just a generic "check the app" prompt.
    // Best-effort, never blocks the actual class creation.
    if (hostLawFirmId) {
      try {
        // Only students subscribed to THIS course at this institution --
        // not every student at the institution regardless of what they study.
        const students = await prisma.user.findMany({
          where: {
            accountType: "STUDENT",
            lawFirmId: hostLawFirmId,
            courseSubscriptions: { some: { courseId: input.courseId } },
          },
          select: { id: true },
        });
        const scheduledLabel = new Date(input.scheduledAt).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        for (const student of students) {
          const notification = await notificationRepository.createNotification({
            title: "New Live Class Scheduled",
            body: `"${input.title}" is scheduled for ${scheduledLabel} (${input.durationMinutes} min).`,
            audience: "INDIVIDUAL_USER",
            targetId: student.id,
            createdBy: creatorId,
          });
          await notificationRepository.bulkCreateUserNotifications(notification.id, [student.id]);
        }
      } catch {
        // Notification failure should never break class creation.
      }
    }

    return liveClass;
  },

  /**
   * A student requests to join — checks BOTH course access AND, for
   * institution-hosted classes, that the student actually belongs to that
   * institution (an IELTS-course subscriber from Institute A should never
   * be able to join Institute B's class for the same course).
   */
  async joinAsStudent(liveClassId: string, studentId: string, studentLawFirmId: string | null) {
    const liveClass: any = await this.getById(liveClassId);

    if (liveClass.hostLawFirmId && liveClass.hostLawFirmId !== studentLawFirmId) {
      throw AppError.forbidden("This class is only open to students of the hosting institution.");
    }

    const allowed = await courseService.canAccess(studentId, liveClass.courseId, liveClass.isFreeDemo);
    if (!allowed) {
      throw AppError.forbidden("Subscribe to this course to join this live class.");
    }

    // Students can only join starting 10 minutes before the scheduled time
    // through the end of the class -- never earlier. The host is exempt
    // (see joinAsHost below), since they need to be in the room first.
    const now = new Date();
    const joinWindowStart = new Date(liveClass.scheduledAt.getTime() - 10 * 60 * 1000);
    const joinWindowEnd = new Date(liveClass.scheduledAt.getTime() + liveClass.durationMinutes * 60 * 1000);
    if (now < joinWindowStart) {
      throw AppError.forbidden("This class hasn't started yet. You can join starting 10 minutes before it begins.");
    }
    if (now > joinWindowEnd && liveClass.status !== "LIVE") {
      throw AppError.forbidden("This class has already ended.");
    }

    await liveClassRepository.recordAttendance(liveClassId, studentId);

    return {
      meetingUrl: `${JITSI_BASE_URL}/${liveClass.jitsiRoomName}`,
      roomName: liveClass.jitsiRoomName,
      title: liveClass.title,
    };
  },

  // The host (Company or institution instructor) joins the same room without a subscription check.
  async joinAsHost(liveClassId: string, requesterId: string, requesterAccountType: string) {
    const liveClass = await this.getById(liveClassId);
    // Only the specific teacher/staff assigned to host this class may join
    // as host -- being a Law Firm Admin no longer grants automatic access
    // to every class, only the one(s) actually assigned to them. Company
    // staff retain access for platform-level oversight/support.
    const isAssignedHost = liveClass.hostId === requesterId;
    const isCompanyStaff = requesterAccountType === "COMPANY";
    if (!isAssignedHost && !isCompanyStaff) {
      throw AppError.forbidden("Only the teacher assigned to host this class may join as host.");
    }
    return {
      meetingUrl: `${JITSI_BASE_URL}/${liveClass.jitsiRoomName}`,
      roomName: liveClass.jitsiRoomName,
      title: liveClass.title,
    };
  },

  async remove(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    if (cls.status === "LIVE") {
      throw AppError.badRequest("Cannot delete a class that is currently live. End it first.");
    }
    await liveClassRepository.delete(id);
  },

  async listAttendees(id: string) {
    await this.getById(id); // 404 if the class doesn't exist
    return liveClassRepository.listAttendees(id);
  },

  async markLive(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "LIVE");
  },

  async markEnded(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "ENDED");
  },

  async uploadRecording(id: string, recordingUrl: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setRecordingUrl(id, recordingUrl);
  },

  async cancel(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "CANCELLED");
  },

  async update(
    id: string,
    input: { title?: string; description?: string; scheduledAt?: string; durationMinutes?: number; isFreeDemo?: boolean; hostId?: string },
    auth: { accountType: string; lawFirmId: string | null }
  ) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    if (cls.status !== "SCHEDULED") {
      throw AppError.badRequest(`Only a SCHEDULED class can be edited. Current status: ${cls.status}`);
    }
    return liveClassRepository.update(id, {
      title: input.title,
      description: input.description,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      durationMinutes: input.durationMinutes,
      isFreeDemo: input.isFreeDemo,
      hostId: input.hostId,
    });
  },
};
