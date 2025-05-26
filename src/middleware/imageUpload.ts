// src/middleware/imageUpload.ts
import multer from "multer";
import path from "path";
import { Request } from "express";

const storage = multer.memoryStorage();

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (![".jpg", ".png"].includes(ext)) {
    return cb(new Error("只接受 JPG/PNG 格式的圖片檔案"));
  }
  cb(null, true);
};

/** 2 MB、JPG/PNG 限制 */
export const imageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});
