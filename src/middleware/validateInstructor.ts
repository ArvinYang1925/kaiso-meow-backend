// src/middlewares/validateInstructor.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "姓名至少 1 個字元")
    .max(100, "姓名最多 100 個字元")
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/, "不得包含特殊字元與空白"),
  avatar: z.string().url("請提供有效的圖片 URL").optional(),
});

export function validateUpdateProfile(req: Request, res: Response, next: NextFunction) {
  const parseResult = updateProfileSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      status: "failed",
      message: "請提供正確的參數",
      errors: parseResult.error.flatten(),
    });
    return;
  }

  req.body = parseResult.data;
  next();
}
