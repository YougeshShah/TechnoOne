import sys

path = 'src/modules/mock-test/dto/mock-test.dto.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''export const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
    })
  ),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;'''

new = '''export const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
    })
  ),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt id"),
});'''

c = content.count(old)
print(f'anchor count = {c}')
if c != 1:
    print('ERROR: aborting.')
    sys.exit(1)
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/mock-test/dto/mock-test.dto.ts')
