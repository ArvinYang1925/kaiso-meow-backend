// src/middleware/isStudent.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./isAuth";

export function isStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "student") {
    res.status(403).json({ status: "failed", message: "權限不足" });
    return;
  }
  next();
}
