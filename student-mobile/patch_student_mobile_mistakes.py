import sys

# Run this from the student-mobile/ root directory.

path = 'app/my-mistakes.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''            {q.answerType !== "FILL_BLANK" && q.answerType !== "SHORT_ANSWER" && q.answerType !== "MULTI_BLANK" &&
              (["A", "B", "C", "D"] as const).map((key) => {
                const optionText = (q as any)[`option${key}`];
                if (!optionText) return null;
                const isCorrect = q.correctOption === key;
                return (
                  <View key={key} style={[styles.optionRow, isCorrect && styles.optionRowCorrect]}>
                    <Text style={[styles.optionText, isCorrect && styles.optionTextCorrect]}>
                      {key}. {optionText} {isCorrect ? "✓" : ""}
                    </Text>
                  </View>
                );
              })}

            {q.correctAnswerText && <Text style={styles.correctAnswerText}>Correct answer: {q.correctAnswerText}</Text>}'''

new1 = '''            {q.answerType !== "FILL_BLANK" && q.answerType !== "SHORT_ANSWER" && q.answerType !== "MULTI_BLANK" &&
              (["A", "B", "C", "D"] as const).map((key) => {
                const optionText = (q as any)[`option${key}`];
                if (!optionText) return null;
                const isCorrect = q.correctOption === key;
                const isYourWrongPick = (q as any).studentAnswer === key && !isCorrect;
                return (
                  <View
                    key={key}
                    style={[styles.optionRow, isCorrect && styles.optionRowCorrect, isYourWrongPick && styles.optionRowWrong]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isCorrect && styles.optionTextCorrect,
                        isYourWrongPick && styles.optionTextWrong,
                      ]}
                    >
                      {key}. {optionText} {isCorrect ? "✓" : ""} {isYourWrongPick ? "✗ Your answer" : ""}
                    </Text>
                  </View>
                );
              })}

            {(q.answerType === "FILL_BLANK" || q.answerType === "SHORT_ANSWER" || q.answerType === "MULTI_BLANK") &&
              (q as any).studentAnswer && <Text style={styles.yourAnswerText}>Your answer: {(q as any).studentAnswer}</Text>}

            {q.correctAnswerText && <Text style={styles.correctAnswerText}>Correct answer: {q.correctAnswerText}</Text>}'''

c1 = content.count(old1)
print(f'render block anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (render block).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  optionRow: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 8 },
  optionRowCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  optionText: { fontSize: 14 },
  optionTextCorrect: { fontWeight: "700", color: "#166534" },
  correctAnswerText: { fontSize: 14, fontWeight: "700", color: "#16A34A", marginTop: 4, marginBottom: 8 },'''

new2 = '''  optionRow: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 8 },
  optionRowCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  optionRowWrong: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  optionText: { fontSize: 14 },
  optionTextCorrect: { fontWeight: "700", color: "#166534" },
  optionTextWrong: { fontWeight: "700", color: "#991B1B" },
  yourAnswerText: { fontSize: 14, fontWeight: "700", color: "#DC2626", marginBottom: 4 },
  correctAnswerText: { fontSize: 14, fontWeight: "700", color: "#16A34A", marginTop: 4, marginBottom: 8 },'''

c2 = content.count(old2)
print(f'styles anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (styles block).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/my-mistakes.tsx')
