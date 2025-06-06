import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/isAuth";
import { AppDataSource } from "../config/db";
import { NewsletterSubscriber } from "../entities/NewsletterSubscriber";
import { subscribeSchema } from "../validator/authValidationSchemas";

const newsletterRepository = AppDataSource.getRepository(NewsletterSubscriber);

/**
 * API #7 POST /api/v1/newsletter/subscribe
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-newsletter-subscribe)
 *
 * 此 API 用於訂閱電子報
 */
export async function subscribeNewsletter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 驗證請求數據
    // 1. 使用 Zod 驗證輸入
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { name, email } = parsed.data;
    const userId = req.user?.id;

    // 檢查 email 是否已存在
    const existingSubscriber = await newsletterRepository.findOne({ where: { email } });
    if (existingSubscriber) {
      res.status(409).json({ status: "failed", message: "感謝支持！您已訂閱過電子報" });
      return;
    }

    // 如果用戶已登入，檢查該用戶是否已訂閱
    if (userId) {
      const existingUserSubscription = await newsletterRepository.findOne({
        where: { userId },
      });
      if (existingUserSubscription) {
        res.status(409).json({ status: "failed", message: "您的帳號已經訂閱過電子報" });
        return;
      }
    }
    // 建立新的訂閱者
    const subscriber = newsletterRepository.create({
      email,
      name,
      user: req.user ? { id: userId } : undefined,
      isVerified: false,
      isActive: true,
    });

    await newsletterRepository.save(subscriber);

    res.status(200).json({
      status: "success",
      message: "已成功訂閱電子報",
      data: {
        name: subscriber.name,
        email: subscriber.email,
        userId: subscriber.userId,
        isVerified: subscriber.isVerified,
        isActive: subscriber.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}
