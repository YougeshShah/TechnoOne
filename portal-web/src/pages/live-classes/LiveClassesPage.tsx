import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useForm } from "react-hook-form";
import { liveClassInstitutionApi } from "../../api/liveClassInstitution.api";
import { userApi } from "../../api/user.api";
import { lawFirmSettingsApi } from "../../api/lawFirmSettings.api";

const statusColors: Record<string, "default" | "success" | "error"> = {
  SCHEDULED: "default",
  LIVE: "success",
  ENDED: "default",
  CANCELLED: "error",
};

interface FormValues {
  title: string;
  description?: string;
  courseId: string;
  scheduledAt: string;
  durationMinutes: number;
  isFreeDemo: boolean;
  hostId?: string; // teacher/staff assigned to host this class -- empty = the creator hosts it themselves
  cohostIds?: string[]; // additional teachers co-hosting this class alongside hostId
}

export function LiveClassesPage() {
  const qc = useQueryClient();
  const { data: classes, isLoading } = useQuery({ queryKey: ["institution-live-classes"], queryFn: () => liveClassInstitutionApi.list() });
  const { data: courses } = useQuery({ queryKey: ["institution-courses"], queryFn: () => liveClassInstitutionApi.courses() });
  const { data: staffList } = useQuery({ queryKey: ["institution-staff-for-liveclass"], queryFn: () => userApi.list({}) });

  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: { durationMinutes: 60, isFreeDemo: false },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["institution-live-classes"] });
  const create = useMutation({
    mutationFn: (values: FormValues) => liveClassInstitutionApi.create({ ...values, scheduledAt: new Date(values.scheduledAt).toISOString() }),
    onSuccess: invalidate,
  });
  const markLive = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.markLive(id), onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.cancel(id), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.remove(id), onSuccess: invalidate });
  const uploadRecording = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => liveClassInstitutionApi.uploadRecording(id, url),
    onSuccess: () => {
      invalidate();
      setRecordingDialogId(null);
      setRecordingUrlInput("");
    },
  });
  const [recordingDialogId, setRecordingDialogId] = useState<string | null>(null);
  const [attendeesDialogId, setAttendeesDialogId] = useState<string | null>(null);
  const { data: attendees } = useQuery({
    queryKey: ["live-class-attendees", attendeesDialogId],
    queryFn: () => liveClassInstitutionApi.listAttendees(attendeesDialogId as string),
    enabled: !!attendeesDialogId,
  });
  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const hostJoin = useMutation({ mutationFn: (id: string) => liveClassInstitutionApi.hostJoin(id) });

  const { data: institutionSettings } = useQuery({
    queryKey: ["institution-settings"],
    queryFn: () => lawFirmSettingsApi.getMine(),
  });
  const updateSettings = useMutation({
    mutationFn: (allowRecordingScreenshots: boolean) => lawFirmSettingsApi.updateMine({ allowRecordingScreenshots }),
    onSuccess: (data) => qc.setQueryData(["institution-settings"], data),
  });

  const onCreate = (values: FormValues) => {
    create.mutate(values, {
      onSuccess: () => {
        reset({ durationMinutes: 60, isFreeDemo: false });
        setDialogOpen(false);
      },
    });
  };

  const handleJoin = (id: string) => {
    markLive.mutate(id);
    hostJoin.mutate(id, { onSuccess: (data) => window.open(data.meetingUrl, "_blank") });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Live Classes
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Schedule Class
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Classes you schedule here are visible only to your own students — not to other institutions' students, even
        for the same course.
      </Typography>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", p: 2, mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Allow screenshots on class recordings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            By default, students can't screenshot or screen-record your class recordings while watching them in the
            app. Turn this on to allow it for your institution's students.
          </Typography>
        </Box>
        <Switch
          checked={institutionSettings?.allowRecordingScreenshots ?? false}
          disabled={!institutionSettings || updateSettings.isPending}
          onChange={(e) => updateSettings.mutate(e.target.checked)}
        />
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {classes?.map((cls) => (
              <TableRow key={cls.id} hover>
                <TableCell>
                  {cls.title}
                  {cls.isFreeDemo && <Chip label="Free" size="small" color="success" sx={{ ml: 1, height: 18 }} />}
                </TableCell>
                <TableCell>{cls.course?.name}</TableCell>
                <TableCell>{cls.host?.fullName || "—"}</TableCell>
                <TableCell>{new Date(cls.scheduledAt).toLocaleString()}</TableCell>
                <TableCell align="center">
                  <Chip label={cls.status} size="small" color={statusColors[cls.status]} />
                </TableCell>
                <TableCell align="right">
                  {(cls.status === "SCHEDULED" || cls.status === "LIVE") && (
                    <Button size="small" startIcon={<VideocamIcon />} onClick={() => handleJoin(cls.id)}>
                      Start / Join
                    </Button>
                  )}
                  {(cls.status === "SCHEDULED" || cls.status === "LIVE") && cls.jitsiRoomName && (
                    <Button
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://meet.jit.si/${cls.jitsiRoomName}`);
                      }}
                    >
                      Copy Link
                    </Button>
                  )}
                  {cls.status === "SCHEDULED" && (
                    <Button size="small" color="error" onClick={() => cancel.mutate(cls.id)}>
                      Cancel
                    </Button>
                  )}
                  {(cls.status === "LIVE" || cls.status === "ENDED") && (
                    <Button size="small" onClick={() => setAttendeesDialogId(cls.id)}>
                      Attendees ({cls._count?.attendees ?? 0})
                    </Button>
                  )}
                  {cls.status === "ENDED" && !(cls as any).recordingUrl && (
                    <Button size="small" onClick={() => setRecordingDialogId(cls.id)}>
                      Add Recording
                    </Button>
                  )}
                  {cls.status !== "LIVE" && (
                    <Button size="small" color="error" onClick={() => { if (window.confirm("Delete this class permanently? This cannot be undone.")) remove.mutate(cls.id); }}>
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {classes?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No live classes scheduled yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Schedule Live Class</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onCreate)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {create.isError && <Alert severity="error">{(create.error as any)?.response?.data?.message || "Failed to schedule class"}</Alert>}
            <Typography variant="caption" color="text.secondary">
              Uses Jitsi Meet (free) — a meeting room is created automatically.
            </Typography>
            <TextField label="Class Title" required fullWidth {...register("title", { required: true })} error={!!formState.errors.title} />
            <TextField label="Description" fullWidth multiline rows={2} {...register("description")} />
            <TextField select label="Course" required fullWidth defaultValue="" {...register("courseId", { required: true })}>
              {courses?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Assign Teacher (optional — defaults to you)" fullWidth defaultValue="" {...register("hostId")}>
              <MenuItem value="">— Host it myself —</MenuItem>
              {staffList?.items.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.fullName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Additional Teachers (co-host, optional)"
              fullWidth
              SelectProps={{ multiple: true }}
              defaultValue={[]}
              {...register("cohostIds")}
            >
              {staffList?.items.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.fullName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Scheduled Date & Time"
              type="datetime-local"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register("scheduledAt", { required: true })}
            />
            <TextField label="Duration (minutes)" type="number" required fullWidth {...register("durationMinutes", { required: true, valueAsNumber: true, min: 1 })} />
            <FormControlLabel control={<Checkbox {...register("isFreeDemo")} />} label="Free Demo — open to students without a subscription" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>
              {create.isPending ? "Scheduling..." : "Schedule Class"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!recordingDialogId} onClose={() => setRecordingDialogId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Add Recording Link</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Paste the link to the recording once it's uploaded elsewhere (e.g. Google Drive, YouTube unlisted, or
            your own storage). Subscribed students will be able to watch it from this page.
          </Typography>
          <TextField
            label="Recording URL"
            fullWidth
            value={recordingUrlInput}
            onChange={(e) => setRecordingUrlInput(e.target.value)}
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRecordingDialogId(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!recordingUrlInput.trim() || uploadRecording.isPending}
            onClick={() => recordingDialogId && uploadRecording.mutate({ id: recordingDialogId, url: recordingUrlInput.trim() })}
          >
            {uploadRecording.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!attendeesDialogId} onClose={() => setAttendeesDialogId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Attendees</DialogTitle>
        <DialogContent>
          {attendees?.length === 0 && <Typography color="text.secondary">No one has joined yet.</Typography>}
          {attendees?.map((a) => (
            <Box key={a.id} sx={{ py: 1, borderBottom: "1px solid #F3F4F6" }}>
              <Typography variant="body2" fontWeight={600}>
                {a.student.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {a.student.email} — joined {new Date(a.joinedAt).toLocaleTimeString()}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAttendeesDialogId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
