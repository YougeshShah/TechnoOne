import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import QuizIcon from "@mui/icons-material/QuizOutlined";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useStudyAnalytics, useMyTestAttempts, usePracticeHistory } from "../../hooks/useProgress";
import { progressApi, PracticeHistoryItem } from "../../api/progress.api";

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #E5E7EB", borderRadius: 3, display: "flex", alignItems: "center", gap: 2 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: "#EFF6FF",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

function scoreColor(percent: number): string {
  if (percent >= 75) return "#059669";
  if (percent >= 50) return "#D97706";
  return "#DC2626";
}

function QuestionReviewCard({
  index,
  question,
  selectedOption,
  isCorrect,
}: {
  index: number;
  question: any;
  selectedOption: string | null;
  isCorrect: boolean | null;
}) {
  const options = [
    { key: "A", text: question?.optionA },
    { key: "B", text: question?.optionB },
    { key: "C", text: question?.optionC },
    { key: "D", text: question?.optionD },
  ].filter((o) => !!o.text);

  const isMcq = options.length > 0 && !!question?.correctOption;

  return (
    <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #E5E7EB", borderRadius: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {index + 1}. {question?.question}
        </Typography>
        {selectedOption === null || selectedOption === "" ? (
          <Chip size="small" label="Skipped / Unanswered" variant="outlined" />
        ) : isCorrect ? (
          <Chip size="small" icon={<CheckCircleIcon />} label="Correct" color="success" />
        ) : (
          <Chip size="small" icon={<CancelIcon />} label="Wrong" color="error" />
        )}
      </Box>

      {isMcq ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {options.map((opt) => {
            const isUserChoice = selectedOption === opt.key;
            const isRightAnswer = question.correctOption === opt.key;

            let bg = "#fff";
            let border = "#E5E7EB";
            let textColor = "inherit";

            if (isRightAnswer) {
              bg = "#ECFDF5";
              border = "#10B981";
              textColor = "#065F46";
            } else if (isUserChoice && !isRightAnswer) {
              bg = "#FEF2F2";
              border = "#EF4444";
              textColor = "#991B1B";
            }

            return (
              <Box
                key={opt.key}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `2px solid ${border}`,
                  bgcolor: bg,
                  color: textColor,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" fontWeight={isRightAnswer || isUserChoice ? 700 : 400}>
                  {opt.key}. {opt.text}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {isUserChoice && (
                    <Chip
                      size="small"
                      label={isRightAnswer ? "Your Answer (Correct)" : "Your Answer (Wrong)"}
                      color={isRightAnswer ? "success" : "error"}
                      sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                    />
                  )}
                  {!isUserChoice && isRightAnswer && (
                    <Chip
                      size="small"
                      label="Correct Answer"
                      color="success"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: isCorrect ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${isCorrect ? "#10B981" : "#EF4444"}` }}>
            <Typography variant="body2" fontWeight={700}>
              Your Answer: {selectedOption || "— (Skipped)"}
            </Typography>
          </Box>
          {!isCorrect && question?.correctAnswerText && (
            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#ECFDF5", border: "1px solid #10B981" }}>
              <Typography variant="body2" fontWeight={700} color="#065F46">
                Correct Answer: {question.correctAnswerText}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {question?.explanation && (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: "#F8FAFC", borderLeft: "4px solid #2563EB" }}>
          <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: "block", mb: 0.25 }}>
            EXPLANATION
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {question.explanation}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export function MyProgressPage() {
  const { data: analytics, isLoading: loadingAnalytics } = useStudyAnalytics();
  const { data: attempts, isLoading: loadingAttempts } = useMyTestAttempts();
  const { data: practiceItems, isLoading: loadingPractice } = usePracticeHistory();

  const [tab, setTab] = useState<0 | 1>(0);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPracticeDate, setSelectedPracticeDate] = useState<string | null>(null);

  const handleOpenAttemptReview = async (attemptId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await progressApi.getAttemptDetail(attemptId);
      setSelectedAttemptDetail(detail);
    } catch {
      alert("Could not load test review details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Group practice questions by Date (YYYY-MM-DD)
  const practiceByDate = useMemo(() => {
    const groups = new Map<string, PracticeHistoryItem[]>();
    for (const item of practiceItems ?? []) {
      const list = groups.get(item.dateKey) ?? [];
      list.push(item);
      groups.set(item.dateKey, list);
    }
    return Array.from(groups.entries()).map(([dateKey, items]) => {
      const correct = items.filter((i) => i.isCorrect).length;
      return {
        dateKey,
        items,
        total: items.length,
        correct,
        accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0,
      };
    });
  }, [practiceItems]);

  const activePracticeGroup = practiceByDate.find((g) => g.dateKey === selectedPracticeDate) ?? null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        My Progress & Exam History
      </Typography>

      {loadingAnalytics ? (
        <CircularProgress size={24} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <StatCard label="Tests Taken" value={analytics?.testsTaken ?? 0} icon={<QuizIcon />} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard label="Average Score" value={`${analytics?.averageScorePercent ?? 0}%`} icon={<TrendingUpIcon />} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard label="Practice Questions" value={analytics?.practiceQuestionsAnswered ?? 0} icon={<QuizIcon />} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard label="Practice Accuracy" value={`${analytics?.practiceAccuracyPercent ?? 0}%`} icon={<TrendingUpIcon />} />
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        <Tab label={`Mock Test History (${(attempts ?? []).length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Daily Practice History (${practiceByDate.length} Days)`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {tab === 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mock Test</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell align="center">Proctoring / Status</TableCell>
                <TableCell align="center">Date</TableCell>
                <TableCell align="right">Review Answers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingAttempts && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loadingAttempts && (attempts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4 }}>
                      <AssignmentTurnedInIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No mock tests taken yet — go practice one!
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {attempts?.map((attempt) => {
                const percent =
                  attempt.submittedAt && attempt.totalQuestions && attempt.score != null
                    ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                    : null;
                return (
                  <TableRow key={attempt.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{attempt.mockTest.title}</TableCell>
                    <TableCell align="center">
                      {attempt.submittedAt ? (
                        <Typography variant="body2" fontWeight={700} sx={{ color: percent !== null ? scoreColor(percent) : undefined }}>
                          {attempt.score}/{attempt.totalQuestions} ({percent}%)
                        </Typography>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "inline-flex", gap: 0.75, alignItems: "center" }}>
                        {attempt.submittedAt ? (
                          <Chip label="Completed" size="small" color="success" />
                        ) : (
                          <Chip label="Incomplete" size="small" />
                        )}
                        {attempt.flagged && (
                          <Chip
                            icon={<WarningAmberIcon />}
                            label={`Flagged (${attempt.appLeftCount ?? 2} warnings)`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {new Date(attempt.startedAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {attempt.submittedAt ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenAttemptReview(attempt.id)}
                          disabled={loadingDetail}
                        >
                          View Questions & Answers
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Not submitted
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Practice Date</TableCell>
                <TableCell align="center">Questions Practiced</TableCell>
                <TableCell align="center">Correct / Accuracy</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingPractice && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loadingPractice && practiceByDate.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No practice questions answered yet!
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {practiceByDate.map((group) => (
                <TableRow key={group.dateKey} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{group.dateKey}</TableCell>
                  <TableCell align="center">{group.total} Questions</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700} sx={{ color: scoreColor(group.accuracy) }}>
                      {group.correct}/{group.total} ({group.accuracy}%)
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setSelectedPracticeDate(group.dateKey)}
                    >
                      View That Day's Questions
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mock Test Full Review Modal */}
      <Dialog open={!!selectedAttemptDetail} onClose={() => setSelectedAttemptDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {selectedAttemptDetail?.mockTest?.title ?? "Mock Test Review"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Score: {selectedAttemptDetail?.score}/{selectedAttemptDetail?.totalQuestions} • Taken on{" "}
              {selectedAttemptDetail?.startedAt ? new Date(selectedAttemptDetail.startedAt).toLocaleString() : ""}
            </Typography>
          </Box>
          {selectedAttemptDetail?.flagged && (
            <Chip color="error" size="small" label={`Flagged (${selectedAttemptDetail.appLeftCount} warnings)`} />
          )}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: "#F9FAFB" }}>
          {(selectedAttemptDetail?.answers ?? []).map((ans: any, idx: number) => (
            <QuestionReviewCard
              key={ans.id ?? idx}
              index={idx}
              question={ans.question}
              selectedOption={ans.selectedOption}
              isCorrect={ans.isCorrect}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setSelectedAttemptDetail(null)}>
            Close Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date-wise Practice Questions Review Modal */}
      <Dialog open={!!activePracticeGroup} onClose={() => setSelectedPracticeDate(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={800}>
            Practice History — {activePracticeGroup?.dateKey}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activePracticeGroup?.correct} of {activePracticeGroup?.total} correct ({activePracticeGroup?.accuracy}%)
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ bgcolor: "#F9FAFB" }}>
          {(activePracticeGroup?.items ?? []).map((item, idx) => (
            <QuestionReviewCard
              key={item.id}
              index={idx}
              question={item.question}
              selectedOption={item.selectedOption}
              isCorrect={item.isCorrect}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setSelectedPracticeDate(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
