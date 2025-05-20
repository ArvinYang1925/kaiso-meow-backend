import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entities/User";
import { sendResetPasswordEmail } from "../utils/mailer";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../validator/authValidationSchemas";
import { generateResetToken } from "../utils/jwtUtils";
import { TokenRequest } from "../middleware/isResetTokenValid";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/isAuth";

/**
 * API #6 POST - `/api/v1/auth/password/forgot`
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-auth-password-forgot-1d06a24685188017bbd6ed92d12b53e5)
 *
 * 此 API 用於當使用者忘記密碼時，寄送一封重設密碼的信件。
 */
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

/**
 * API #9 POST - `/api/v1/auth/password/reset`
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-auth-password-reset-1d66a246851880d3ab2fe578356f79db?pvs=4)
 *
 * 此 API 用於完成密碼重設。前端會攜帶從 email 取得的 token 以及新密碼，系統會驗證 token 並設定新密碼。成功後即可使用新密碼登入。
 */
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

/**
 * API #3 POST - `/api/v1/auth/password/change`
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PUT-api-v1-auth-password-change-1d06a24685188087a53de0074a325575?pvs=4)
 *
 * 此 API 學生登入後，讓學生更新自己的登入密碼。
 */
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
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepo.save(user);

    res.json({ status: "success", message: "密碼變更成功" });
  } catch (err) {
    next(err);
  }
}
