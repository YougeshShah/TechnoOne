import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";
import { env } from "../../config/env";
import { AppError } from "../errors/AppError";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE_BYTES = 30 * 1024 * 1024; // 30MB — audio clips run longer than a document page

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    // Files are namespaced by lawFirmId — keeps each tenant's documents in
    // their own folder on disk, mirroring the DB-level multi-tenant isolation.
    const lawFirmId = req.auth?.lawFirmId || "unassigned";
    const dir = path.join(process.cwd(), env.storage.localUploadDir, lawFirmId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX"));
  }
  cb(null, true);
}

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Library resources (Acts, Gazette PDFs, etc.) — Company-managed, not tenant-scoped,
// so files go under a flat uploads/library/ folder instead of per-lawFirmId.
const libraryStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "library");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

export const libraryUpload = multer({
  storage: libraryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Listening question audio clips — own folder, bigger size cap than
// documents since a full listening-section audio clip runs several minutes.
const audioStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "audio");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

export const audioUpload = multer({
  storage: audioStorage,
  fileFilter,
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES },
});

// Profile photos — small, image-only, own folder so they're easy to serve/cache separately.
const AVATAR_MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB — a profile photo never needs to be huge
const avatarStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "avatars");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.auth?.userId || "user"}-${Date.now()}${ext}`);
  },
});

function avatarFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const imageTypes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);
  if (!imageTypes.has(file.mimetype)) {
    return cb(new Error("Profile photo must be an image (JPG, PNG, or WEBP)"));
  }
  cb(null, true);
}

export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES },
});

export function mapMulterError(err: unknown): AppError {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return AppError.badRequest("File is too large. Maximum size is 10MB.");
    }
    return AppError.badRequest(err.message);
  }
  if (err instanceof Error) {
    return AppError.badRequest(err.message);
  }
  return AppError.badRequest("File upload failed");
}
// ------------------------------------------------------------
// APPEND THIS TO THE END OF src/common/middleware/upload.ts
// ------------------------------------------------------------

// Speaking test recordings — video or audio, own folder, own (larger) size
// cap since a 2-minute video runs much bigger than a document or even a
// listening audio clip. Stored per-student so recordings are easy to
// locate/clean up per user if needed later.
const SPEAKING_MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80MB — generous for a ~2 min video recording at reasonable quality
const SPEAKING_ALLOWED_MIME_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
]);

const speakingStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "speaking");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith("video") ? ".webm" : ".mp3");
    const safeName = `${req.auth?.userId || "student"}-${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

function speakingFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!SPEAKING_ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Unsupported recording format. Allowed: WEBM/MP4 video, or MP3/WAV/OGG audio."));
  }
  cb(null, true);
}

export const speakingUpload = multer({
  storage: speakingStorage,
  fileFilter: speakingFileFilter,
  limits: { fileSize: SPEAKING_MAX_SIZE_BYTES },
});
// ============================================================
// APPEND THIS TO THE END OF src/common/middleware/upload.ts
// ============================================================

// Institution payment QR codes -- small image, own folder.
const QR_CODE_MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB, same reasoning as avatars -- a QR code image never needs to be huge
const qrCodeStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "payment-qr");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.auth?.lawFirmId || "firm"}-${Date.now()}${ext}`);
  },
});
function qrCodeFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const imageTypes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);
  if (!imageTypes.has(file.mimetype)) {
    return cb(new Error("Payment QR code must be an image (JPG, PNG, or WEBP)"));
  }
  cb(null, true);
}
export const qrCodeUpload = multer({
  storage: qrCodeStorage,
  fileFilter: qrCodeFileFilter,
  limits: { fileSize: QR_CODE_MAX_SIZE_BYTES },
});

// Payment vouchers -- student's proof of manual payment (bank
// transfer/cash receipt screenshot), own folder per student's law firm.
const voucherStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "vouchers");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.auth?.userId || "student"}-${Date.now()}-${uuidv4()}${ext}`);
  },
});

export const voucherUpload = multer({
  storage: voucherStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Course content (semester/term-wise study material) -- PDF or image,
// own folder. Text-type content has no file, stored directly in DB.
const courseContentStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "course-content");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

export const courseContentUpload = multer({
  storage: courseContentStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});


// Chat/ticket attachments -- screenshots or short documents shared inside
// a real messaging conversation or a support ticket. Own folder, image +
// PDF only, moderate size cap (a screenshot, not a video).
const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const CHAT_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

const chatAttachmentStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dir = path.join(process.cwd(), env.storage.localUploadDir, "chat-attachments");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.auth?.userId || "user"}-${Date.now()}-${uuidv4()}${ext}`);
  },
});

function chatAttachmentFileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Unsupported file type. Allowed: JPG, PNG, WEBP, PDF"));
  }
  cb(null, true);
}

export const chatAttachmentUpload = multer({
  storage: chatAttachmentStorage,
  fileFilter: chatAttachmentFileFilter,
  limits: { fileSize: CHAT_ATTACHMENT_MAX_SIZE_BYTES },
});

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

