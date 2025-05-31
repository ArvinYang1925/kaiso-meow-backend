// src/middleware/videoUpload.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { tmpdir } from "os";
import { Request } from "express";

const tempVideoDir = path.join(tmpdir(), "upload-videos");
if (!fs.existsSync(tempVideoDir)) {
  fs.mkdirSync(tempVideoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempVideoDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const videoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (![".mp4", ".mov", ".mkv", ".avi"].includes(ext)) {
    return cb(new Error("只接受 MP4/MOV/MKV/AVI 影片格式"));
  }
  cb(null, true);
};

export const videoUpload = multer({
  storage,
  limits: { fileSize: 1000 * 1024 * 1024 }, // 限制大小 1000MB
  fileFilter: videoFileFilter,
});
