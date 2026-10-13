import sys

# Run this from the student-web/ root directory.

path = 'src/pages/dashboard/MyMistakesPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''            {q.answerType !== "FILL_BLANK" && q.answerType !== "SHORT_ANSWER" && q.answerType !== "MULTI_BLANK" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const optionText = (q as any)[`option${key}`];
                  if (!optionText) return null;
                  const isCorrect = q.correctOption === key;
                  return (
                    <Box
                      key={key}
                      sx={{
                        p: 1.25,
                        border: `1px solid ${isCorrect ? "#16A34A" : "#E5E7EB"}`,
                        bgcolor: isCorrect ? "#F0FDF4" : "#fff",
                        borderRadius: 1.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={isCorrect ? 700 : 400}>
                        {key}. {optionText} {isCorrect && "✓"}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {q.correctAnswerText && (
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 700, color: "#16A34A" }}>
                Correct answer: {q.correctAnswerText}
              </Typography>
            )}'''

new1 = '''            {q.answerType !== "FILL_BLANK" && q.answerType !== "SHORT_ANSWER" && q.answerType !== "MULTI_BLANK" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const optionText = (q as any)[`option${key}`];
                  if (!optionText) return null;
                  const isCorrect = q.correctOption === key;
                  const isYourWrongPick = (q as any).studentAnswer === key && !isCorrect;
                  return (
                    <Box
                      key={key}
                      sx={{
                        p: 1.25,
                        border: `1px solid ${isCorrect ? "#16A34A" : isYourWrongPick ? "#DC2626" : "#E5E7EB"}`,
                        bgcolor: isCorrect ? "#F0FDF4" : isYourWrongPick ? "#FEF2F2" : "#fff",
                        borderRadius: 1.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={isCorrect || isYourWrongPick ? 700 : 400}
                        sx={{ color: isYourWrongPick ? "#991B1B" : undefined }}
                      >
                        {key}. {optionText} {isCorrect && "✓"} {isYourWrongPick && "✗ Your answer"}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {(q.answerType === "FILL_BLANK" || q.answerType === "SHORT_ANSWER" || q.answerType === "MULTI_BLANK") &&
              (q as any).studentAnswer && (
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 700, color: "#DC2626" }}>
                  Your answer: {(q as any).studentAnswer}
                </Typography>
              )}

            {q.correctAnswerText && (
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 700, color: "#16A34A" }}>
                Correct answer: {q.correctAnswerText}
              </Typography>
            )}'''

c1 = content.count(old1)
print(f'render block anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (render block).')
    sys.exit(1)
content = content.replace(old1, new1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/pages/dashboard/MyMistakesPage.tsx')
