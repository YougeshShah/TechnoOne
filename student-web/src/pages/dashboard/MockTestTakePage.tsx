import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/TimerOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { RatingWidget } from "../../components/common/RatingWidget";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt } from "../../hooks/useCourse";
import { TestAttemptResult } from "../../types/course.types";
import { mockTestApi } from "../../api/course.api";

type OptionKey = "A" | "B" | "C" | "D";

export function MockTestTakePage() {
  const { courseId, mockTestId } = useParams<{ courseId: string; mockTestId: string }>();
  const navigate = useNavigate();

  const { data: test, isLoading: loadingTest } = useMockTestDetail(mockTestId);
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, OptionKey | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<TestAttemptResult | null>(null);

  useEffect(() => {
    if (test && !attemptId && !startAttempt.isPending) {
      startAttempt.mutate(mockTestId as string, {
        onSuccess: (data) => {
          setAttemptId(data.attemptId);
          setSecondsLeft(data.durationMinutes * 60);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  const handleSubmit = useCallback(() => {
    if (!attemptId) return;
    const answerList = (test?.questions ?? []).map((q: any) => ({
      questionId: q.questionId,
      selectedOption: answers[q.questionId] ?? null,
    }));
    submitAttempt.mutate(
      { attemptId, answers: answerList },
      {
        onSuccess: (data) => {
          setConfirmOpen(false);
          setResult(data);
        },
      }
    );
  }, [attemptId, answers, test, submitAttempt]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const violationCountRef = useRef(0);

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

  // Camera Proctoring Stream
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
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [result]);

  // Periodic snapshot every 3 minutes
  useEffect(() => {
    if (!attemptId || result) return;
    const interval = setInterval(takeProctoringSnapshot, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [attemptId, result, takeProctoringSnapshot]);

  // Anti-Cheat: Tab switch (2-warning auto-submit), copy-paste & right-click block
  useEffect(() => {
    if (!attemptId || result) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        violationCountRef.current += 1;
        mockTestApi.recordViolation(attemptId).catch(() => {});
        takeProctoringSnapshot();
        if (violationCountRef.current >= 2) {
          alert("Test Terminated: You have exceeded the maximum number of warnings (2/2) for switching tabs or minimizing. Your test is being submitted automatically.");
          handleSubmit();
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
  }, [attemptId, result, handleSubmit, takeProctoringSnapshot]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, result, handleSubmit]);

  if (loadingTest || !test) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (result) {
    return (
      <Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center", mt: 6 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {result.percentage >= 70 ? "🎉" : "📊"}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Test Complete
        </Typography>
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, my: 3 }}>
          <Typography variant="h3" fontWeight={800} color="primary">
            {result.percentage}%
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {result.score} out of {result.totalQuestions} correct
          </Typography>
          {result.negativeMarkingApplied && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Marks (with negative marking): {result.marksScored} / {result.totalMarks}
            </Typography>
          )}
        </Paper>
        {mockTestId && (
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3, textAlign: "left" }}>
            <RatingWidget targetType="MOCK_TEST" targetId={mockTestId} label="How was this mock test?" />
          </Paper>
        )}
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

  if (!attemptId || secondsLeft === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const questions = test.questions ?? [];
  const currentQ = questions[currentIndex];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const totalCount = questions.length;
  const answeredCount = questions.filter((q: any) => !!answers[q.questionId]).length;
  const unansweredCount = totalCount - answeredCount;
  const flaggedList = questions
    .map((q: any, idx: number) => (flaggedQuestions[q.questionId] ? idx + 1 : null))
    .filter((n: number | null): n is number => n !== null);
  const flaggedUnansweredList = questions
    .map((q: any, idx: number) => (flaggedQuestions[q.questionId] && !answers[q.questionId] ? idx + 1 : null))
    .filter((n: number | null): n is number => n !== null);

  const isLowTime = secondsLeft < 60;
  const isCurrentFlagged = currentQ ? !!flaggedQuestions[currentQ.questionId] : false;

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const options: { key: OptionKey; text: string }[] = currentQ
    ? [
        { key: "A", text: currentQ.question.optionA },
        { key: "B", text: currentQ.question.optionB },
        { key: "C", text: currentQ.question.optionC },
        { key: "D", text: currentQ.question.optionD },
      ]
    : [];

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", userSelect: "none" }}>
      {/* Sticky header: timer + live counters */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
          p: 2,
          bgcolor: isLowTime ? "#FEF2F2" : "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {test.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total: {totalCount} | Answered: {answeredCount} | Unanswered: {unansweredCount} | Flagged: {flaggedList.length}
          </Typography>
        </Box>
        <Chip
          icon={<TimerIcon />}
          label={`${minutes}:${seconds.toString().padStart(2, "0")}`}
          color={isLowTime ? "error" : "default"}
          sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}
        sx={{ height: 6, borderRadius: 3, mb: 2, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { borderRadius: 3 } }}
      />

      {/* Legend + Question navigator */}
      <Box sx={{ display: "flex", gap: 2, mb: 1, fontSize: 12, color: "text.secondary", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: "#EFF6FF", border: "1px solid #2563EB" }} /> Answered ({answeredCount})
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: "#FEF3C7", border: "1px solid #D97706" }} /> Flagged ({flaggedList.length})
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: "#fff", border: "1px solid #E5E7EB" }} /> Not Answered ({unansweredCount})
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
        {questions.map((q: any, i: number) => {
          const isAns = !!answers[q.questionId];
          const isFlg = !!flaggedQuestions[q.questionId];
          return (
            <Box
              key={q.questionId}
              onClick={() => setCurrentIndex(i)}
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                position: "relative",
                border: i === currentIndex ? "2px solid #2563EB" : isFlg ? "2px solid #D97706" : "1px solid #E5E7EB",
                bgcolor: isFlg ? "#FEF3C7" : isAns ? "#EFF6FF" : "#fff",
                color: isFlg ? "#B45309" : isAns ? "primary.main" : "text.secondary",
              }}
            >
              {i + 1}
            </Box>
          );
        })}
      </Box>

      {/* Current question */}
      {currentQ && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
            <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.5 }}>
              {currentIndex + 1}. {currentQ.question.question}
            </Typography>
            <Button
              size="small"
              variant={isCurrentFlagged ? "contained" : "outlined"}
              color="warning"
              startIcon={isCurrentFlagged ? <FlagIcon /> : <OutlinedFlagIcon />}
              onClick={() => toggleFlag(currentQ.questionId)}
              sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700 }}
            >
              {isCurrentFlagged ? "Flagged" : "Flag for Review"}
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {options.map((opt) => {
              const isSelected = answers[currentQ.questionId] === opt.key;
              return (
                <Box
                  key={opt.key}
                  onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.questionId]: opt.key }))}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.75,
                    border: `2px solid ${isSelected ? "#2563EB" : "#E5E7EB"}`,
                    bgcolor: isSelected ? "#EFF6FF" : "#fff",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { borderColor: "#93C5FD" },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? "#2563EB" : "#E5E7EB"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isSelected ? "primary.main" : "text.secondary",
                      flexShrink: 0,
                    }}
                  >
                    {opt.key}
                  </Box>
                  <Typography variant="body1">{opt.text}</Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
          Previous
        </Button>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {currentIndex + 1 < questions.length && (
            <Button variant="outlined" color="secondary" onClick={() => setConfirmOpen(true)}>
              Finish & Review
            </Button>
          )}
          {currentIndex + 1 < questions.length ? (
            <Button variant="contained" onClick={() => setCurrentIndex((i) => i + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="contained" color="secondary" startIcon={<CheckCircleIcon />} onClick={() => setConfirmOpen(true)}>
              Submit Test
            </Button>
          )}
        </Box>
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
              <Typography variant="h6" fontWeight={800} sx={{ color: "#B45309" }}>{flaggedList.length}</Typography>
              <Typography variant="caption" color="text.secondary">Flagged for Review</Typography>
            </Paper>
          </Box>

          {flaggedList.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have <b>{flaggedList.length} flagged question(s)</b> (#{flaggedList.join(", #")})
              {flaggedUnansweredList.length > 0
                ? ` — and #${flaggedUnansweredList.join(", #")} are still unanswered!`
                : "."}
            </Alert>
          )}
          {unansweredCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You still have <b>{unansweredCount}</b> unanswered question(s). Once submitted, you cannot return to this test.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Go Back to Questions</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitAttempt.isPending}>
            {submitAttempt.isPending ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Webcam Proctoring Feed */}
      <Box sx={{ position: "fixed", bottom: 84, right: 20, width: 130, height: 98, bgcolor: "black", borderRadius: 2, overflow: "hidden", border: "2px solid #1976d2", zIndex: 1300, boxShadow: 3, pointerEvents: "none", opacity: 0.92 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <Typography variant="caption" sx={{ position: "absolute", bottom: 2, left: 4, color: "white", bgcolor: "rgba(0,0,0,0.6)", px: 0.5, borderRadius: 1, fontSize: "10px" }}>
          Proctored
        </Typography>
      </Box>
    </Box>
  );
}
