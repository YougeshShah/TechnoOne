import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import TimerIcon from "@mui/icons-material/TimerOutlined";
import { RatingWidget } from "../../components/common/RatingWidget";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt } from "../../hooks/useCourse";
import { TestAttemptResult } from "../../types/course.types";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<TestAttemptResult | null>(null);

  // Start the attempt as soon as the test detail loads.
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
      { onSuccess: (data) => setResult(data) }
    );
  }, [attemptId, answers, test, submitAttempt]);

  // Countdown timer — auto-submits when it hits zero.
  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    
  // Anti-Cheat Security Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("Warning: Tab switching or minimizing is strictly prohibited during the mock test!");
      }
    };
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Copying or pasting text is disabled during the exam.");
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
  }, []);

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
      <Box sx={{ maxWidth: 480, mx: "auto", textAlign: "center", mt: 6 }}>
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
        <Button variant="contained" onClick={() => navigate(`/courses/${courseId}`)}>
          Back to Course
        </Button>
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
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const isLowTime = secondsLeft < 60;

  const options: { key: OptionKey; text: string }[] = currentQ
    ? [
        { key: "A", text: currentQ.question.optionA },
        { key: "B", text: currentQ.question.optionB },
        { key: "C", text: currentQ.question.optionC },
        { key: "D", text: currentQ.question.optionD },
      ]
    : [];

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* Sticky header: timer + progress */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          p: 2,
          bgcolor: isLowTime ? "#FEF2F2" : "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          {test.title}
        </Typography>
        <Chip
          icon={<TimerIcon />}
          label={`${minutes}:${seconds.toString().padStart(2, "0")}`}
          color={isLowTime ? "error" : "default"}
          sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        />
      </Box>

      <LinearProgress variant="determinate" value={(answeredCount / questions.length) * 100} sx={{ height: 6, borderRadius: 3, mb: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { borderRadius: 3 } }} />

      {/* Question navigator */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
        {questions.map((q: any, i: number) => (
          <Box
            key={q.questionId}
            onClick={() => setCurrentIndex(i)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: i === currentIndex ? "2px solid #2563EB" : "1px solid #E5E7EB",
              bgcolor: answers[q.questionId] ? "#EFF6FF" : "#fff",
              color: answers[q.questionId] ? "primary.main" : "text.secondary",
            }}
          >
            {i + 1}
          </Box>
        ))}
      </Box>

      {/* Current question */}
      {currentQ && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3, lineHeight: 1.5 }}>
            {currentIndex + 1}. {currentQ.question.question}
          </Typography>
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
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
          Previous
        </Button>
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

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Submit this test?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You've answered {answeredCount} of {questions.length} questions. Unanswered questions will be marked
            incorrect. This can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Keep Working</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitAttempt.isPending}>
            {submitAttempt.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
