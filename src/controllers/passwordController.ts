import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entities/User";
import { sendResetPasswordEmail } from "../utils/mailer";
import { forgotPasswordSchema } from "../validator/authValidationSchemas";
import { generateResetPasswordToken } from "../utils/jwtUtils";

export async function sendForgotPasswordEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ status: "failed", message: "請提供有效的 email 格式", errors: result.error });
      return;
    }
    const { email } = result.data;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });

    if (!user) {
      res.status(404).json({ status: "failed", message: "查無此信箱，請重新輸入" });
      return;
    }

    const token = generateResetPasswordToken(user.id);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendResetPasswordEmail(email, resetUrl);

    res.json({ status: "success", message: "已寄送重設連結到您的信箱，請於15分鐘內完成以免失效" });
  } catch (err) {
    next(err);
  }
}
