import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entities/User";
import { sendResetPasswordEmail } from "../utils/mailer";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../validator/authValidationSchemas";
import { generateResetToken } from "../utils/jwtUtils";
import { TokenRequest } from "../middleware/isResetTokenValid";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/isAuth";

export async function sendForgotPasswordEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ status: "failed", message: "請提供有效的 email 格式" });
      return;
    }
    const { email } = result.data;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });

    if (!user) {
      res.status(404).json({ status: "failed", message: "查無此信箱，請重新輸入" });
      return;
    }

    const token = generateResetToken({ userId: user.id });
    const resetUrl = `${process.env.FRONTEND_URL}#/reset-password/${token}`;

    await sendResetPasswordEmail(email, resetUrl);

    res.json({ status: "success", message: "已寄送重設連結到您的信箱，請於15分鐘內完成以免失效" });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordWithToken(req: TokenRequest, res: Response, next: NextFunction) {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { newPassword } = req.body;
    const { resetPayload } = req;
    const userRepo = AppDataSource.getRepository(User);
    if (!resetPayload) {
      res.status(400).json({ status: "failed", message: "無效的 payload" });
      return;
    }
    const user = await userRepo.findOneBy({ id: resetPayload!.userId });
    if (!user) {
      res.status(400).json({ status: "failed", message: "使用者不存在" });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepo.save(user);
    res.json({ status: "success", message: "密碼重新設定成功" });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    const err = result.error.errors[0];
    res.status(400).json({
      status: "failed",
      message: err.message,
    });
    return;
  }

  const { oldPassword, newPassword } = result.data;
  const userId = req.user?.id;
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });

    if (!user) {
      res.status(401).json({ status: "failed", message: "身份授權失敗" });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ status: "failed", message: "舊密碼有誤，請重新輸入" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepo.save(user);

    res.json({ status: "success", message: "密碼變更成功" });
  } catch (err) {
    next(err);
  }
}
