// src/middleware/isInstructor.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./isAuth";

export function isInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "instructor") {
    res.status(403).json({ status: "failed", message: "權限不足" });
    return;
  }
  next();
}
