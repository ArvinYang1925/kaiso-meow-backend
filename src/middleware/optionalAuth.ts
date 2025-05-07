// src/middleware/optionalAuth.ts 訂閱電子報檢查若為登入狀態儲存使用者id，若非登入，則不儲存
import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwtUtils";
import { AuthRequest } from "./isAuth";

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  // 如果沒有 token，直接通過
  if (!auth?.startsWith("Bearer ")) {
    next();
    return;
  }

  // 如果有 token，嘗試解析
  const token = auth.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
  } catch {
    // token 無效也沒關係，直接通過
  }
  next();
}
