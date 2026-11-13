import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import { useForm } from "react-hook-form";
import { apiClient } from "../../api/client";
import { liveClassInstitutionApi } from "../../api/liveClassInstitution.api";
import { useInstitutionMockTestsAdmin, useInstitutionMockTestAdminActions } from "../../hooks/useInstitutionMockTestAdmin";
import { useInstitutionSectionsAdmin, useInstitutionSectionAdminActions } from "../../hooks/useInstitutionSectionAdmin";
import { CreateMockTestPayload, institutionMockTestApi, FlaggedAttemptItem } from "../../api/institutionMockTest.api";
import { CreateSectionPayload } from "../../api/institutionTestSection.api";

const sectionTypes = ["MCQ", "READING", "LISTENING", "WRITING", "SPEAKING"];

function getSnapshotFullUrl(relPath: string): string {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || "https://api.technocraftx.com/api/v1";
  const origin = apiBase.replace(/\/api\/v1\/?$/, "");
  const clean = relPath.replace(/^\/+/, "").replace(/^uploads\/+/, "");
  return `${origin}/uploads/${clean}`;
}

function useInstitutionSubjectsForCourse(courseId: string) {
  return useQuery({
    queryKey: ["institution-subjects-mocktest", courseId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { id: string; name: string }[] }>("/subjects", { params: { courseId } });
      return data.data;
    },
    enabled: !!courseId,
  });
}

function FlaggedAttemptsDialog({
  mockTestId,
  mockTestTitle,
  onClose,
}: {
  mockTestId?: string;
  mockTestTitle?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: flaggedAttempts, isLoading } = useQuery({
    queryKey: ["institution-flagged-attempts", mockTestId ?? "ALL"],
    queryFn: () => institutionMockTestApi.listFlaggedAttempts(mockTestId),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ attemptId, action }: { attemptId: string; action: "APPROVE" | "DISQUALIFY" }) =>
      institutionMockTestApi.resolveFlaggedAttempt(attemptId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["institution-flagged-attempts"] });
    },
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Proctoring Review Queue {mockTestTitle ? `— ${mockTestTitle}` : "(All Mock Tests)"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reviewing an attempt (Approve or Disqualify) automatically deletes its proctoring snapshots from server storage.
          </Typography>
        </Box>
        <Chip
          icon={<WarningAmberIcon />}
          label={`${flaggedAttempts?.length ?? 0} Pending`}
          color={(flaggedAttempts?.length ?? 0) > 0 ? "error" : "success"}
          size="small"
        />
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ bgcolor: "#F9FAFB" }}>
        {isLoading && <Typography sx={{ py: 4, textAlign: "center" }}>Loading flagged attempts...</Typography>}
        {!isLoading && (flaggedAttempts?.length ?? 0) === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px solid #E5E7EB", borderRadius: 2 }}>
            <Typography variant="body1" fontWeight={600}>
              No flagged attempts awaiting review!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All suspicious attempts have been resolved and their snapshots purged.
            </Typography>
          </Paper>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {flaggedAttempts?.map((item: FlaggedAttemptItem) => (
            <Paper key={item.id} elevation={0} sx={{ p: 2.5, border: "1px solid #FECACA", bgcolor: "#fff", borderRadius: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {item.student?.fullName || "Student"} ({item.student?.email || item.studentId})
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Test: <b>{item.mockTest?.title || "Mock Test"}</b> • Started: {new Date(item.startedAt).toLocaleString()}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                    <Chip size="small" color="error" label={`Tab/App Switches: ${item.appLeftCount}`} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={item.submittedAt ? `Score: ${item.score ?? 0}/${item.totalQuestions}` : "Not Submitted"}
                    />
                    <Chip size="small" variant="outlined" label={`Snapshots: ${item.proctoringSnapshotUrls?.length ?? 0}`} />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleOutlineIcon />}
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ attemptId: item.id, action: "APPROVE" })}
                  >
                    Approve & Purge Photos
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<BlockIcon />}
                    disabled={resolveMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Disqualify this attempt (sets score to 0) and purge snapshots?")) {
                        resolveMutation.mutate({ attemptId: item.id, action: "DISQUALIFY" });
                      }
                    }}
                  >
                    Disqualify (0 Score)
                  </Button>
                </Box>
              </Box>

              {item.proctoringSnapshotUrls && item.proctoringSnapshotUrls.length > 0 ? (
                <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", py: 1 }}>
                  {item.proctoringSnapshotUrls.map((relUrl, idx) => {
                    const fullUrl = getSnapshotFullUrl(relUrl);
                    return (
                      <Box
                        key={idx}
                        component="a"
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: "block",
                          width: 140,
                          height: 105,
                          borderRadius: 1.5,
                          overflow: "hidden",
                          border: "2px solid #EF4444",
                          flexShrink: 0,
                          position: "relative",
                          bgcolor: "#000",
                        }}
                      >
                        <img
                          src={fullUrl}
                          alt={`Snapshot ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            position: "absolute",
                            bottom: 2,
                            right: 4,
                            bgcolor: "rgba(0,0,0,0.7)",
                            color: "#fff",
                            px: 0.5,
                            borderRadius: 0.5,
                            fontSize: 10,
                          }}
                        >
                          #{idx + 1}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No camera snapshots were captured for this attempt (webcam unavailable or blocked).
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionsDialog({ mockTestId, onClose }: { mockTestId: string; onClose: () => void }) {
  const { data: sections } = useInstitutionSectionsAdmin(mockTestId);
  const { create, remove } = useInstitutionSectionAdminActions();
  const { register, handleSubmit, reset, watch } = useForm<CreateSectionPayload>({
    defaultValues: { mockTestId, type: "READING", order: 0 },
  });
  const selectedType = watch("type");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const onCreate = (values: CreateSectionPayload) => {
    create.mutate(
      { ...values, mockTestId, order: sections?.length ?? 0, audioFile } as any,
      { onSuccess: () => { reset({ mockTestId, type: "READING", order: 0 }); setAudioFile(null); } }
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Manage Sections (IELTS-style)</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Add Reading/Listening/Writing/Speaking sections. A test with no sections is treated as a flat MCQ test.
        </Typography>

        {sections?.map((s) => (
          <Box key={s.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1, borderBottom: "1px solid #F3F4F6" }}>
            <Box>
              <Chip label={s.type} size="small" sx={{ mr: 1 }} />
              <Typography variant="body2" component="span">
                {s.title}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => remove.mutate(s.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}

        <Box component="form" onSubmit={handleSubmit(onCreate)} sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          {create.isError && <Alert severity="error">{(create.error as any)?.response?.data?.message}</Alert>}
          <Typography variant="subtitle2" fontWeight={700}>
            Add Section
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField select label="Type" fullWidth defaultValue="READING" {...register("type")}>
              {sectionTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Title" required fullWidth placeholder="e.g. Reading Passage 1" {...register("title", { required: true })} />
          </Box>

          {selectedType === "READING" && (
            <TextField label="Passage Text" multiline rows={4} fullWidth {...register("passageText")} />
          )}
          {selectedType === "LISTENING" && (
            <Box>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                {audioFile ? audioFile.name : "Upload Audio Clip"}
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg"
                  hidden
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {audioFile && (
                <Button size="small" color="error" onClick={() => setAudioFile(null)} sx={{ ml: 1 }}>
                  Remove
                </Button>
              )}
              {!audioFile && <TextField label="Or paste an Audio URL instead" fullWidth sx={{ mt: 1.5 }} placeholder="https://..." {...register("audioUrl")} />}
            </Box>
          )}
          {selectedType === "WRITING" && (
            <>
              <TextField label="Writing Prompt" multiline rows={3} fullWidth {...register("writingPrompt")} />
              <TextField label="Minimum Word Count" type="number" fullWidth {...register("minWordCount", { valueAsNumber: true })} />
            </>
          )}
          {selectedType === "SPEAKING" && (
            <TextField
              label="Topic / Cue Card"
              multiline
              rows={3}
              fullWidth
              placeholder='e.g. "Describe a place you would like to visit. You should say: where it is, why you want to go there, what you would do there, and explain why this place appeals to you."'
              {...register("writingPrompt")}
            />
          )}
          <TextField label="Time Limit (minutes, optional)" type="number" fullWidth {...register("timeLimitMinutes", { valueAsNumber: true })} />

          <Button type="submit" variant="contained" disabled={create.isPending} sx={{ alignSelf: "flex-start" }}>
            {create.isPending ? "Adding..." : "Add Section"}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function InstitutionMockTestAdminPage() {
  const { data: courses } = useQuery({ queryKey: ["institution-courses-mocktest"], queryFn: () => liveClassInstitutionApi.courses() });
  const [courseId, setCourseId] = useState<string>("");
  const selectedCourseName = courses?.find((c: any) => c.id === courseId)?.name ?? "";
  const isLawCourse = selectedCourseName.toLowerCase().includes("law");
  const isLoksewaCourse = selectedCourseName.toLowerCase().includes("loksewa");
  const { data: subjects } = useInstitutionSubjectsForCourse(courseId);
  const { data: tests, isLoading } = useInstitutionMockTestsAdmin(courseId || undefined);
  const { create, publish } = useInstitutionMockTestAdminActions();

  const { data: allFlagged } = useQuery({
    queryKey: ["institution-flagged-attempts", "ALL"],
    queryFn: () => institutionMockTestApi.listFlaggedAttempts(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionsForTestId, setSectionsForTestId] = useState<string | null>(null);
  const [flaggedModalTarget, setFlaggedModalTarget] = useState<{ id?: string; title?: string } | null>(null);

  const { register, handleSubmit, reset, formState } = useForm<CreateMockTestPayload>({
    defaultValues: { durationMinutes: 60, questionCount: 25, marksPerQuestion: 1, negativeMarkingPercent: 0 },
  });

  const onCreate = (values: CreateMockTestPayload) => {
    create.mutate(
      { ...values, courseId },
      {
        onSuccess: () => {
          reset({ durationMinutes: 60, questionCount: 25, marksPerQuestion: 1, negativeMarkingPercent: 0 });
          setDialogOpen(false);
        },
      }
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Mock Tests
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant={(allFlagged?.length ?? 0) > 0 ? "contained" : "outlined"}
            color="error"
            startIcon={<WarningAmberIcon />}
            onClick={() => setFlaggedModalTarget({})}
          >
            Flagged Attempts ({allFlagged?.length ?? 0})
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} disabled={!courseId}>
            Create Mock Test
          </Button>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Mock tests you create here are visible only to your own institution's students — not to other institutions
        or the general public.
      </Typography>

      <TextField select label="Course" size="small" value={courseId} onChange={(e) => setCourseId(e.target.value)} sx={{ minWidth: 260, mb: 3 }}>
        <MenuItem value="">Select a course</MenuItem>
        {courses?.map((c: any) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {courseId && (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="center">Duration</TableCell>
                <TableCell align="center">Questions</TableCell>
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
              {tests?.map((test) => {
                const flaggedForThisTest = (allFlagged ?? []).filter((f) => f.mockTestId === test.id).length;
                return (
                  <TableRow key={test.id} hover>
                    <TableCell>{test.title}</TableCell>
                    <TableCell>{test.subject?.name ?? "—"}</TableCell>
                    <TableCell align="center">{test.durationMinutes} min</TableCell>
                    <TableCell align="center">{test._count?.questions ?? 0}</TableCell>
                    <TableCell align="center">
                      {test.isPublished ? <Chip label="Published" color="success" size="small" /> : <Chip label="Draft" size="small" />}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color={flaggedForThisTest > 0 ? "error" : "inherit"}
                        startIcon={<WarningAmberIcon fontSize="small" />}
                        onClick={() => setFlaggedModalTarget({ id: test.id, title: test.title })}
                      >
                        Flagged ({flaggedForThisTest})
                      </Button>
                      <Button size="small" onClick={() => setSectionsForTestId(test.id)}>
                        Sections
                      </Button>
                      {!test.isPublished && (
                        <Button size="small" onClick={() => publish.mutate(test.id)} disabled={publish.isPending}>
                          Publish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tests?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No mock tests yet for this course.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Mock Test</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onCreate)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {create.isError && (
              <Alert severity="error">{(create.error as any)?.response?.data?.message || "Failed to create mock test"}</Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              Questions are pulled at random from your own institution's question bank for this course/subject — add
              enough questions first so there's something to draw from.
            </Typography>
            <TextField label="Test Title" required fullWidth {...register("title", { required: true })} error={!!formState.errors.title} />
            <TextField select label="Subject (optional — leave blank to pull from all subjects)" fullWidth {...register("subjectId")}>
              <MenuItem value="">All Subjects</MenuItem>
              {subjects?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>

            {isLawCourse && (
              <TextField select label="Exam Track (optional)" fullWidth defaultValue="" {...register("examType")}>
                <MenuItem value="">General / Not specific</MenuItem>
                <MenuItem value="LLB">LLB</MenuItem>
                <MenuItem value="BALLB">BALLB</MenuItem>
                <MenuItem value="BAR_COUNCIL">Bar Council</MenuItem>
                <MenuItem value="JUDICIAL_SERVICE">Judicial Service</MenuItem>
                <MenuItem value="PUBLIC_SERVICE_COMMISSION">Public Service Commission (Law)</MenuItem>
              </TextField>
            )}

            {isLoksewaCourse && (
              <TextField select label="Position Level (optional)" fullWidth defaultValue="" {...register("examType")}>
                <MenuItem value="">General / All levels</MenuItem>
                <MenuItem value="KHARIDAR">Kharidar (Non-Gazetted 3rd Class)</MenuItem>
                <MenuItem value="NAYAB_SUBBA">Nayab Subba (Non-Gazetted 1st Class)</MenuItem>
                <MenuItem value="SECTION_OFFICER">Section Officer / Sakha Adhikrit (Gazetted 3rd Class)</MenuItem>
              </TextField>
            )}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Duration (minutes)"
                type="number"
                required
                fullWidth
                {...register("durationMinutes", { required: true, valueAsNumber: true, min: 1 })}
              />
              <TextField
                label="Number of Questions"
                type="number"
                required
                fullWidth
                {...register("questionCount", { required: true, valueAsNumber: true, min: 1 })}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Marks per Question"
                type="number"
                fullWidth
                defaultValue={1}
                helperText="e.g. IOE Part A = 1, Part B = 2 — create separate tests for mixed weighting"
                {...register("marksPerQuestion", { valueAsNumber: true, min: 1 })}
              />
              <TextField
                label="Negative Marking % (0 = none)"
                type="number"
                fullWidth
                defaultValue={0}
                helperText="e.g. IOE ~10, Medical (MECEE-BL) 25 — leave 0 for Law/IELTS practice"
                {...register("negativeMarkingPercent", { valueAsNumber: true, min: 0, max: 100 })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Test"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {sectionsForTestId && <SectionsDialog mockTestId={sectionsForTestId} onClose={() => setSectionsForTestId(null)} />}
      {flaggedModalTarget && (
        <FlaggedAttemptsDialog
          mockTestId={flaggedModalTarget.id}
          mockTestTitle={flaggedModalTarget.title}
          onClose={() => setFlaggedModalTarget(null)}
        />
      )}
    </Box>
  );
}
