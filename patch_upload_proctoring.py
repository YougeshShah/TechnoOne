import sys

# Run this from backend/ root directory.

path = 'src/common/middleware/upload.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

addition = '''

// Mock-test proctoring snapshots -- small, low-res JPEGs taken periodically
// during a test attempt (never continuous video/audio -- keeps storage
// tiny). Own folder, per-student filenames, very small size cap since these
// are deliberately compressed client-side before upload.
const PROCTORING_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB -- a compressed low-res JPEG is a few KB to a few hundred KB at most
const proctoringStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "proctoring");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.auth?.userId || "student"}-${Date.now()}-${uuidv4()}${ext}`);
  },
});

function proctoringFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const imageTypes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);
  if (!imageTypes.has(file.mimetype)) {
    return cb(new Error("Proctoring snapshot must be an image (JPG, PNG, or WEBP)"));
  }
  cb(null, true);
}

export const proctoringUpload = multer({
  storage: proctoringStorage,
  fileFilter: proctoringFileFilter,
  limits: { fileSize: PROCTORING_MAX_SIZE_BYTES },
});
'''

if 'export const proctoringUpload' in content:
    print('proctoringUpload already present -- skipping (already patched).')
else:
    content = content.rstrip('\n') + addition + '\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Appended proctoringUpload to src/common/middleware/upload.ts')
