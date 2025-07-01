import { Response, NextFunction } from "express";
import { createCouponSchema } from "../validator/couponVaildationschema";
import { AppDataSource } from "../config/db";
import { Coupon } from "../entities/Coupon";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema, paginationSchema } from "../validator/commonValidationSchemas";
import { IsNull } from "typeorm";
import { formatDate } from "../utils/dateUtils";
import { generateCouponsPlan } from "../services/aiService";
import { QueryRunner, In } from "typeorm";
import { aiCouponPlanInputSchema, aiCouponPlanResponseSchema, createBatchCouponsSchema } from "../validator/couponVaildationschema";
/**
 * API #47 POST - /api/v1/instructor/coupons
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-coupons-1d06a246851880d59743efa4cbca6bf1?pvs=4)
 *
 * 此 API 讓講師可新增折扣碼
 */
export async function createCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = createCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({
        status: "failed",
        message: err.message,
      });
      return;
    }
    const userId = req.user?.id;

    const couponRepo = AppDataSource.getRepository(Coupon);

    // 分別檢查 code 和 couponName 是否已存在
    const existingCode = await couponRepo.findOne({
      where: { code: parsed.data.code, deletedAt: IsNull() },
    });

    const existingName = await couponRepo.findOne({
      where: { couponName: parsed.data.couponName, deletedAt: IsNull() },
    });

    if (existingCode || existingName) {
      res.status(409).json({
        status: "failed",
        message:
          existingCode && existingName
            ? "折扣碼代碼和名稱都已存在，請使用其他代碼和名稱"
            : existingCode
              ? "折扣碼代碼已存在，請使用其他代碼"
              : "折扣碼名稱已存在，請使用其他名稱",
      });
      return;
    }

    const coupon = couponRepo.create({
      couponName: parsed.data.couponName,
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      startsAt: parsed.data.startsAt,
      expiresAt: parsed.data.expiresAt,
      instructorId: userId,
    });

    await couponRepo.save(coupon);

    res.status(200).json({
      status: "success",
      message: "折扣碼新增成功",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API #46 GET -/api/v1/instructor/coupons?page=1&pageSize=10
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-coupons-page-1-pageSize-10-1d06a246851880608bc4d9ab8a82c638?pvs=4)
 *
 * 此 API 讓講師可查看折扣碼
 */
export async function getCouponsByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({
        status: "failed",
        message: err.message,
      });
      return;
    }
    const userId = req.user?.id;
    const { page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    const [data, total] = await AppDataSource.getRepository(Coupon).findAndCount({
      where: {
        instructorId: userId,
        deletedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
      skip,
      take: pageSize,
      select: ["id", "couponName", "type", "code", "value", "startsAt", "expiresAt"],
    });

    const couponList = data.map((coupon) => ({
      ...coupon,
      startsAt: coupon.startsAt ? formatDate(coupon.startsAt) : null,
      expiresAt: coupon.expiresAt ? formatDate(coupon.expiresAt) : null,
    }));

    res.status(200).json({
      status: "success",
      data: {
        couponList,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API #46 DELETE - /api/v1/instructor/coupons/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/DELETE-api-v1-instructor-coupons-id-1d06a2468518807fbc86f3026c9b4b87?pvs=4)
 *
 * 此 API 讓講師可以刪除折扣碼
 */
export async function deleteCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const userId = req.user?.id;
    const couponId = req.params.id;
    const couponRepo = AppDataSource.getRepository(Coupon);

    const coupon = await couponRepo.findOne({
      where: { id: couponId, deletedAt: IsNull() },
    });

    if (!coupon) {
      res.status(404).json({ status: "failed", message: "找不到指定的折扣碼 ID" });
      return;
    }

    if (coupon.instructorId !== userId) {
      res.status(403).json({ status: "failed", message: "沒有刪除此折扣碼的權限" });
      return;
    }

    // TODO: 查詢是否有訂單使用該折扣碼（若有此需求）
    // const isUsed = await orderRepo.findOne({ where: { couponId: id } });
    // if (isUsed) { return res.status(409).json({ ... }); }

    await couponRepo.softRemove(coupon);

    res.status(200).json({ status: "success", message: "折扣碼刪除成功" });
  } catch (error) {
    next(error);
  }
}

/**
 * API #54 POST - /api/v1/instructor/coupons/ai-generate
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-coupons-ai-generate-20c6a246851880cbb68cd9f04bb4d6a6?source=copy_link)
 *
 * 此 API 讓講師可用AI折扣碼草稿產生
 */
export async function generateAICoupons(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = aiCouponPlanInputSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        status: "failed",
        message: result.error.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const { courseDescription, launchDate, numberOfPhases, discountType, keywordThemes, phaseDurationDays } = result.data;
    const instructorId = req.user?.id;

    if (!instructorId) {
      res.status(401).json({ status: "failed", message: "未授權，請重新登入" });
      return;
    }

    const aiResult = await generateCouponsPlan({
      description: courseDescription,
      keywordThemes,
      numberOfPhases,
      launchDate,
      discountType,
      phaseDurationDays,
    });

    const parsed = aiCouponPlanResponseSchema.safeParse(aiResult);
    if (!parsed.success) {
      res.status(422).json({
        status: "failed",
        message: "AI 回傳格式錯誤：" + parsed.error.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: parsed.data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #55 POST - /api/v1/instructor/coupons/batch
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-coupons-batch-20c6a246851880d6b1e9f93063a73b1d?source=copy_link)
 *
 * 此 API 讓講師可批量新增折扣碼
 */
export async function createBatchCoupons(req: AuthRequest, res: Response, next: NextFunction) {
  const instructorId = req.user?.id;

  try {
    const parsed = createBatchCouponsSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "參數驗證失敗";
      res.status(400).json({ status: "failed", message: firstError });
      return;
    }

    const { coupons } = parsed.data;

    const queryRunner: QueryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const codes = coupons.map((c) => c.code);
      const names = coupons.map((c) => c.couponName);

      const existed = await queryRunner.manager.find(Coupon, {
        where: [
          { code: In(codes), instructorId },
          { couponName: In(names), instructorId },
        ],
        select: ["code", "couponName"],
      });

      if (existed.length > 0) {
        const duplicatedCodes = existed.map((e) => e.code);
        const duplicatedNames = existed.map((e) => e.couponName);
        const duplicateMessage = [
          duplicatedCodes.length ? `code：${duplicatedCodes.join(", ")}` : null,
          duplicatedNames.length ? `couponName：${duplicatedNames.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("，");

        await queryRunner.rollbackTransaction();
        res.status(409).json({
          status: "failed",
          message: `以下欄位重複：${duplicateMessage}`,
        });
        return;
      }

      const newCoupons = coupons.map((c) =>
        queryRunner.manager.create(Coupon, {
          ...c,
          startsAt: new Date(c.startsAt),
          expiresAt: new Date(c.expiresAt),
          instructorId,
        }),
      );

      const saved = await queryRunner.manager.save(newCoupons);
      await queryRunner.commitTransaction();

      res.status(200).json({
        status: "success",
        data: {
          couponList: saved.map(({ couponName, type, code, value, startsAt, expiresAt }) => ({
            couponName,
            type,
            code,
            value,
            startsAt,
            expiresAt,
          })),
        },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  } catch (err) {
    next(err);
  }
}
