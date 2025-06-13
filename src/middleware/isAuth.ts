// src/middleware/isAuth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwtUtils";
import { Course } from "../entities/Course";

export interface AuthRequest extends Request {
  user?: JWTPayload;
  course?: Course;
}

export function isAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ status: "failed", message: "請先登入" });
    return;
  }
  const token = auth.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ status: "failed", message: "Token 無效或已過期" });
    return;
  }
}
