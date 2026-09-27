export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountType: "STUDENT";
  tenantName?: string | null;
  // Only present on the full /auth/me response (profileApi.getMe), not on
  // the login response -- carries the student's institution settings.
  lawFirm?: { allowRecordingScreenshots?: boolean } | null;
}

export interface Course {
  id: string;
  name: string;
  category: "LAW" | "LANGUAGE" | "OTHER";
  description: string | null;
}

export interface CourseSubscription {
  id: string;
  courseId: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
}

export interface McqQuestion {
  id: string;
  question: string;
  answerType?: "MCQ" | "TRUE_FALSE_NOT_GIVEN" | "YES_NO_NOT_GIVEN" | "FILL_BLANK" | "SHORT_ANSWER" | "MULTI_BLANK";
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  courseId: string;
  subjectId: string;
  isFreeDemo: boolean;
  audioUrl?: string | null;
  // Only present on /mcq/my-mistakes — a review/answer-reveal endpoint.
  correctOption?: string;
  correctAnswerText?: string;
  explanation?: string | null;
  subject?: { name: string };
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
}

export interface MockTest {
  id: string;
  title: string;
  courseId: string;
  durationMinutes: number;
  isFreeDemo: boolean;
  negativeMarkingPercent?: number;
  _count?: { questions: number };
}

export interface TestQuestion {
  questionId: string;
  question: { id: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string };
}

export interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  scheduledAt: string;
  durationMinutes: number;
  isFreeDemo: boolean;
  status: string;
  recordingUrl: string | null;
}

export interface LibraryResource {
  id: string;
  title: string;
  type: string;
  content: string | null;
  fileUrl: string | null;
  isDownloadable: boolean;
}

export interface Bookmark {
  id: string;
  resourceType: "LIBRARY" | "MCQ";
  resourceId: string;
  preview: string;
  courseId?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
