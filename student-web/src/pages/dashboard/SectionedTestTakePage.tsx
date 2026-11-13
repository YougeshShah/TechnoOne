import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/HeadphonesOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import EditNoteIcon from "@mui/icons-material/EditNoteOutlined";
import MicIcon from "@mui/icons-material/MicNoneOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt, useSubmitWriting } from "../../hooks/useCourse";
import { TestAttemptResult } from "../../types/course.types";
import { TestSection } from "../../api/testSection.api";
import { mockTestApi } from "../../api/course.api";

type OptionKey = "A" | "B" | "C" | "D";

function splitEmbeddedPassage(text: string): { passage: string | null; question: string } {
  const match = text.match(/^(?:Reading Passage|Listening Transcript):\s*"([\s\S]*?)"\s*\n\n([\s\S]*)$/);
  if (match) {
    return { passage: match[1], question: match[2] };
  }
  return { passage: null, question: text };
}

const sectionMeta: Record<string, { icon: JSX.Element; label: string }> = {
  READING: { icon: <MenuBookIcon fontSize="small" />, label: "Reading" },
  LISTENING: { icon: <HeadphonesIcon fontSize="small" />, label: "Listening" },
  WRITING: { icon: <EditNoteIcon fontSize="small" />, label: "Writing" },
  SPEAKING: { icon: <MicIcon fontSize="small" />, label: "Speaking" },
  MCQ: { icon: <MenuBookIcon fontSize="small" />, label: "Questions" },
};

export function SectionedTestTakePage() {
  const { courseId, mockTestId } = useParams<{ courseId: string; mockTestId: string }>();
  const navigate = useNavigate();

  const { data: test, isLoading } = useMockTestDetail(mockTestId);
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();
  const submitWriting = useSubmitWriting();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [writingSubmitted, setWritingSubmitted] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<TestAttemptResult | null>(null);
  const questionsPaneRef = useRef<HTMLDivElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const violationCountRef = useRef(0);

  const handleFinish = useCallback(() => {
    if (!attemptId) return;
    const mcqAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));
    submitAttempt.mutate(
      { attemptId, answers: mcqAnswers },
      {
        onSuccess: (data) => {
          setConfirmOpen(false);
          setResult(data);
        },
      }
    );
  }, [attemptId, answers, submitAttempt]);

  const takeProctoringSnapshot = useCallback(() => {
    if (!attemptId || !videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          mockTestApi.uploadProctoringSnapshot(attemptId, blob).catch(() => {});
        }
      },
      "image/jpeg",
      0.4
    );
  }, [attemptId]);

  // Block Browser Back Button & Tab Close until test is submitted
  useEffect(() => {
    if (!attemptId || result) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      alert("You cannot go back while a mock test is in progress. Please submit the test to finish.");
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [attemptId, result]);

  // Camera Proctoring Setup
  useEffect(() => {
    if (result) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {});
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [result]);

  // Periodic snapshot every 3 minutes
  useEffect(() => {
    if (!attemptId || result) return;
    const interval = setInterval(takeProctoringSnapshot, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [attemptId, result, takeProctoringSnapshot]);

  // Anti-Cheat Security: Tab switch (2-warning auto-submit), copy-paste block & right-click restriction
  useEffect(() => {
    if (!attemptId || result) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        violationCountRef.current += 1;
        mockTestApi.recordViolation(attemptId).catch(() => {});
        takeProctoringSnapshot();
        if (violationCountRef.current >= 2) {
          alert("Test Terminated: You have exceeded the maximum number of warnings (2/2) for switching tabs or minimizing. Your test is being submitted automatically.");
          handleFinish();
        } else {
          alert(`Security Warning (${violationCountRef.current}/2): Tab switching or minimizing is not allowed during the mock test! After 2 warnings, your test will automatically close.`);
        }
      }
    };
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Copy/Paste is disabled during the exam.");
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [attemptId, result, handleFinish, takeProctoringSnapshot]);

  useEffect(() => {
    if (test?.durationMinutes && attemptId && !result) {
      setSecondsLeft(test.durationMinutes * 60);
    }
  }, [test?.durationMinutes, attemptId, result]);

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleFinish();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, result, handleFinish]);

  const formattedTimeLeft =
    secondsLeft !== null
      ? `${Math.floor(secondsLeft / 3600)
          .toString()
          .padStart(2, "0")}:${Math.floor((secondsLeft % 3600) / 60)
          .toString()
          .padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`
      : null;

  useEffect(() => {
    if (test && !attemptId && !startAttempt.isPending) {
      startAttempt.mutate(mockTestId as string, { onSuccess: (data) => setAttemptId(data.attemptId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  useEffect(() => {
    questionsPaneRef.current?.scrollTo({ top: 0 });
  }, [activeSectionIndex]);

  const sections: TestSection[] = test?.sections ?? [];
  const hasSections = sections.length > 0;
  const effectiveSections: TestSection[] = hasSections
    ? sections
    : [
        {
          id: "flat",
          type: "MCQ",
          title: "Questions",
          passageText: null,
          audioUrl: null,
          writingPrompt: null,
          minWordCount: null,
          timeLimitMinutes: null,
          order: 0,
          mockTestQuestions: (test?.questions ?? []).map((q: any) => ({ questionId: q.questionId, order: q.order, question: q.question })),
        },
      ];
  const activeSection = effectiveSections[activeSectionIndex];
  const isLastSection = activeSectionIndex === effectiveSections.length - 1;
  const hasSidePanel = activeSection?.type === "READING" || activeSection?.type === "LISTENING";

  const allMcqQuestions = effectiveSections.flatMap((s) => s.mockTestQuestions ?? []);
  const totalCount = allMcqQuestions.length;
  const answeredCount = allMcqQuestions.filter((q) => !!answers[q.questionId]).length;
  const unansweredCount = totalCount - answeredCount;
  const flaggedCount = allMcqQuestions.filter((q) => !!flaggedQuestions[q.questionId]).length;
  const flaggedUnansweredCount = allMcqQuestions.filter((q) => !!flaggedQuestions[q.questionId] && !answers[q.questionId]).length;

  const derivedPassage =
    activeSection && !activeSection.passageText && activeSection.mockTestQuestions.length > 0
      ? splitEmbeddedPassage(activeSection.mockTestQuestions[0].question.question).passage
      : null;
  const displayPassageText = activeSection?.passageText || derivedPassage;

  const handleSubmitWriting = (sectionId: string) => {
    if (!attemptId) return;
    submitWriting.mutate(
      { sectionId, attemptId, essayText: essays[sectionId] ?? "" },
      { onSuccess: () => setWritingSubmitted((prev) => ({ ...prev, [sectionId]: true })) }
    );
  };

  if (isLoading || !test) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (result) {
    return (
      <Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center", mt: 6 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Test Submitted
        </Typography>
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            MCQ sections: {result.score}/{result.totalQuestions} correct ({result.percentage}%)
          </Typography>
          {result.negativeMarkingApplied && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Marks (with negative marking): {result.marksScored} / {result.totalMarks}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            You can view full question-by-question answers and explanations in your Progress & History page.
          </Typography>
        </Paper>
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center" }}>
          <Button variant="outlined" onClick={() => navigate("/progress")}>
            Review Answers in History
          </Button>
          <Button variant="contained" onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </Box>
      </Box>
    );
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const renderQuestions = (compact: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: compact ? 2.5 : 3 }}>
      {activeSection.mockTestQuestions.map((mq, qi) => {
        const isFlg = !!flaggedQuestions[mq.questionId];
        return (
          <Box key={mq.questionId} id={`q-${mq.questionId}`}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
              <Typography variant="body1" fontWeight={600}>
                {qi + 1}. {splitEmbeddedPassage(mq.question.question).question}
              </Typography>
              <Button
                size="small"
                variant={isFlg ? "contained" : "outlined"}
                color="warning"
                startIcon={isFlg ? <FlagIcon /> : <OutlinedFlagIcon />}
                onClick={() => setFlaggedQuestions((prev) => ({ ...prev, [mq.questionId]: !prev[mq.questionId] }))}
                sx={{ flexShrink: 0, textTransform: "none", fontSize: 11, py: 0.25 }}
              >
                {isFlg ? "Flagged" : "Flag"}
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(["A", "B", "C", "D"] as OptionKey[]).map((key) => {
                const optionText = mq.question[`option${key}` as "optionA"];
                if (!optionText) return null;
                const isSelected = answers[mq.questionId] === key;
                return (
                  <Box
                    key={key}
                    onClick={() => setAnswers((prev) => ({ ...prev, [mq.questionId]: key }))}
                    sx={{
                      p: 1.25,
                      border: `1px solid ${isSelected ? "#2563EB" : "#E5E7EB"}`,
                      bgcolor: isSelected ? "#EFF6FF" : "#fff",
                      borderRadius: 1.5,
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      "&:hover": { borderColor: "#93C5FD" },
                    }}
                  >
                    <Typography variant="body2">
                      {key}. {optionText}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)", userSelect: "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
          {test.title}
        </Typography>
        {formattedTimeLeft && (
          <Chip
            label={`⏱ ${formattedTimeLeft}`}
            color={secondsLeft !== null && secondsLeft < 300 ? "error" : "default"}
            sx={{ mr: 1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          />
        )}
        <Chip size="small" label={`Answered: ${answeredCount}/${totalCount}`} color="primary" variant="outlined" />
        <Chip size="small" label={`Skipped: ${unansweredCount}`} variant="outlined" />
        <Chip size="small" label={`Flagged: ${flaggedCount}`} color={flaggedCount > 0 ? "warning" : "default"} variant={flaggedCount > 0 ? "filled" : "outlined"} />
        <Box sx={{ flex: 1 }} />
        {effectiveSections.map((s, i) => {
          const meta = sectionMeta[s.type] ?? sectionMeta.MCQ;
          const isDone = s.type === "WRITING" ? writingSubmitted[s.id] : s.mockTestQuestions.every((q) => answers[q.questionId]);
          return (
            <Chip
              key={s.id}
              icon={meta.icon}
              label={s.title}
              onClick={() => setActiveSectionIndex(i)}
              color={activeSectionIndex === i ? "primary" : isDone ? "success" : "default"}
              variant={activeSectionIndex === i ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          );
        })}
      </Box>

      {/* Quick question status bar for current section */}
      {activeSection.mockTestQuestions.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
          {activeSection.mockTestQuestions.map((mq, qi) => {
            const isAns = !!answers[mq.questionId];
            const isFlg = !!flaggedQuestions[mq.questionId];
            return (
              <Box
                key={mq.questionId}
                onClick={() => document.getElementById(`q-${mq.questionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isFlg ? "2px solid #D97706" : isAns ? "1px solid #2563EB" : "1px solid #E5E7EB",
                  bgcolor: isFlg ? "#FEF3C7" : isAns ? "#EFF6FF" : "#fff",
                  color: isFlg ? "#B45309" : isAns ? "primary.main" : "text.secondary",
                }}
              >
                {qi + 1}
              </Box>
            );
          })}
        </Box>
      )}

      {hasSidePanel ? (
        <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
          <Paper
            elevation={0}
            sx={{
              flex: "0 0 45%",
              border: "1px solid #E5E7EB",
              borderRadius: 3,
              p: 3,
              overflowY: "auto",
              bgcolor: "#FAFBFC",
            }}
          >
            <Chip size="small" icon={sectionMeta[activeSection.type].icon} label={sectionMeta[activeSection.type].label} sx={{ mb: 2 }} />
            {activeSection.type === "READING" && displayPassageText && (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                {displayPassageText}
              </Typography>
            )}
            {activeSection.type === "LISTENING" && activeSection.audioUrl && (
              <Box sx={{ position: "sticky", top: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Listen carefully — in the real exam, audio plays only once. Answer as you listen.
                </Typography>
                <audio controls src={activeSection.audioUrl} style={{ width: "100%" }} />
              </Box>
            )}
          </Paper>

          <Box ref={questionsPaneRef} sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3 }}>
              {renderQuestions(true)}
            </Paper>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, maxWidth: 800 }}>
            <Chip size="small" icon={sectionMeta[activeSection.type].icon} label={sectionMeta[activeSection.type].label} sx={{ mb: 2 }} />

            {activeSection.type === "MCQ" && renderQuestions(false)}

            {activeSection.type === "WRITING" && (
              <Box>
                {activeSection.writingPrompt && (
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                    {activeSection.writingPrompt}
                  </Typography>
                )}
                {activeSection.minWordCount && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Minimum {activeSection.minWordCount} words
                  </Typography>
                )}
                {writingSubmitted[activeSection.id] ? (
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    Submitted — awaiting grading.
                  </Typography>
                ) : (
                  <>
                    <TextField
                      multiline
                      rows={14}
                      fullWidth
                      placeholder="Write your response here..."
                      value={essays[activeSection.id] ?? ""}
                      onChange={(e) => setEssays((prev) => ({ ...prev, [activeSection.id]: e.target.value }))}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {wordCount(essays[activeSection.id] ?? "")} words
                      </Typography>
                      <Button variant="contained" size="small" onClick={() => handleSubmitWriting(activeSection.id)} disabled={submitWriting.isPending}>
                        Submit Essay
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            )}

            {activeSection.type === "SPEAKING" && (
              <Box>
                {activeSection.writingPrompt ? (
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                    {activeSection.writingPrompt}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No topic set for this Speaking part yet.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button disabled={activeSectionIndex === 0} onClick={() => setActiveSectionIndex((i) => i - 1)}>
          Previous Part
        </Button>
        {!isLastSection ? (
          <Tooltip title="Answers are saved automatically as you go">
            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => setActiveSectionIndex((i) => i + 1)}>
              Next Part
            </Button>
          </Tooltip>
        ) : (
          <Button variant="contained" color="secondary" onClick={() => setConfirmOpen(true)} disabled={submitAttempt.isPending}>
            {submitAttempt.isPending ? "Submitting..." : "Finish Test"}
          </Button>
        )}
      </Box>

      {/* Pre-Submit Summary Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Exam Summary Before Submit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, my: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
              <Typography variant="h6" fontWeight={800}>{totalCount}</Typography>
              <Typography variant="caption" color="text.secondary">Total Questions</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "#EFF6FF", borderColor: "#93C5FD" }}>
              <Typography variant="h6" fontWeight={800} color="primary.main">{answeredCount}</Typography>
              <Typography variant="caption" color="text.secondary">Attempted</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "#FEF2F2", borderColor: "#FECACA" }}>
              <Typography variant="h6" fontWeight={800} color="error.main">{unansweredCount}</Typography>
              <Typography variant="caption" color="text.secondary">Unanswered / Skipped</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "#FEF3C7", borderColor: "#FDE68A" }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: "#B45309" }}>{flaggedCount}</Typography>
              <Typography variant="caption" color="text.secondary">Flagged for Review</Typography>
            </Paper>
          </Box>

          {flaggedCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have <b>{flaggedCount} flagged question(s)</b>
              {flaggedUnansweredCount > 0 ? ` (${flaggedUnansweredCount} still unanswered!)` : "."}
            </Alert>
          )}
          {unansweredCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You still have <b>{unansweredCount}</b> unanswered question(s). Once submitted, you cannot return to this test.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Review Questions</Button>
          <Button variant="contained" color="primary" onClick={handleFinish} disabled={submitAttempt.isPending}>
            {submitAttempt.isPending ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Webcam Proctoring Feed */}
      <Box sx={{ position: "fixed", bottom: 84, right: 20, width: 130, height: 98, bgcolor: "black", borderRadius: 2, overflow: "hidden", border: "2px solid #1976d2", zIndex: 1300, boxShadow: 3, pointerEvents: "none", opacity: 0.92 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: 105, objectFit: "cover" }} />
        <Typography variant="caption" sx={{ position: "absolute", bottom: 2, left: 4, color: "white", bgcolor: "rgba(0,0,0,0.6)", px: 0.5, borderRadius: 1, fontSize: "10px" }}>
          Proctored
        </Typography>
      </Box>
    </Box>
  );
}
