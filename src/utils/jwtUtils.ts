// src/utils/jwtUtils.ts
import * as jwt from "jsonwebtoken";

// 先定義好 payload 介面，確保 TS 可以找到它
export interface JWTPayload {
  id: string;
  role: "student" | "instructor";
}

// 確保 env 裡有 JWT_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}
const SECRET = process.env.JWT_SECRET; // 類型推斷為 string

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

/**
 * 產生一支 JWT
 */
export function generateToken(payload: JWTPayload): string {
  // 直接把 expiresIn 斷言成 SignOptions 裡允許的型別
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

/**
 * 驗證並解析 JWT
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}

/**
 * 忘記密碼的暫時 JWT
 */
export function generateResetPasswordToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: "15m" });
}
