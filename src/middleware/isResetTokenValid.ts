import { Request, Response, NextFunction } from "express";
import { verifyResetToken } from "../utils/jwtUtils";

export interface ResetTokenPayload {
  userId: string;
}

export interface TokenRequest extends Request {
  resetPayload?: ResetTokenPayload;
}

export function isResetTokenValid(req: TokenRequest, res: Response, next: NextFunction) {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({
      status: "failed",
      message: "請提供 token",
    });
  }

  try {
    const payload = verifyResetToken(token);
    req.resetPayload = payload; // 把 payload 附加到 req 供 controller 使用
    next();
  } catch (err: unknown) {
    const message = err instanceof Error && err.name === "TokenExpiredError" ? "token 已過期" : "token 無效";
    res.status(401).json({
      status: "failed",
      message,
    });
  }
}
