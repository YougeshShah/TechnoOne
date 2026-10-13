import sys

path = 'src/modules/mock-test/controller/mock-test.controller.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { createMockTestSchema, listMockTestsQuerySchema, mockTestIdParamSchema, submitAttemptSchema } from "../dto/mock-test.dto";'''
new1 = '''import { createMockTestSchema, listMockTestsQuerySchema, mockTestIdParamSchema, submitAttemptSchema, attemptIdParamSchema } from "../dto/mock-test.dto";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  async getAttemptResult(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id: attemptId } = mockTestIdParamSchema.parse({ id: req.params.attemptId });
    const result = await mockTestService.getAttemptResult(attemptId, req.auth.userId);
    res.status(200).json({ success: true, data: result });
  },
};'''

new2 = '''  async getAttemptResult(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id: attemptId } = mockTestIdParamSchema.parse({ id: req.params.attemptId });
    const result = await mockTestService.getAttemptResult(attemptId, req.auth.userId);
    res.status(200).json({ success: true, data: result });
  },

  async uploadProctoringSnapshot(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest("No snapshot file was uploaded");
    const { attemptId } = attemptIdParamSchema.parse(req.params);
    const relativePath = `proctoring/${req.file.filename}`;
    const result = await mockTestService.addProctoringSnapshot(attemptId, req.auth.userId, relativePath);
    res.status(201).json({ success: true, data: result });
  },

  async recordViolation(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { attemptId } = attemptIdParamSchema.parse(req.params);
    const result = await mockTestService.recordViolation(attemptId, req.auth.userId);
    res.status(200).json({ success: true, data: { appLeftCount: result.appLeftCount, flagged: result.flagged } });
  },
};'''

c2 = content.count(old2)
print(f'handlers anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (handlers).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/mock-test/controller/mock-test.controller.ts')
