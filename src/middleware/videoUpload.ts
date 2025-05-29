// src/middleware/videoUpload.ts
import multer from "multer";
import path from "path";
import { Request } from "express";

const storage = multer.memoryStorage();

const videoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".mp4", ".mov", ".avi"];
  if (!allowed.includes(ext)) {
    return cb(new Error("僅接受影片格式（.mp4, .mov, .avi）"));
  }
  cb(null, true);
};

export const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: videoFileFilter,
});
