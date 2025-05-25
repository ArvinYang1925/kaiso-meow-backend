// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from "express";
import multer from "multer";

export const handleMulterError: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        res.status(400).json({ status: "failed", message: "檔案大小超過限制 (最大2MB)" });
        return;

      case "LIMIT_UNEXPECTED_FILE":
        res.status(400).json({ status: "failed", message: "一次只能上傳1張圖片" });
        return;
    }
  }

  if (err instanceof Error && err.message.includes("只接受")) {
    res.status(400).json({ status: "failed", message: err.message });
    return;
  }

  next(err); // 交給全域 500 handler
};
