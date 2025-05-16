import { Response, NextFunction } from "express";
import { createCouponSchema } from "../validator/couponVaildationschema";
import { AppDataSource } from "../config/db";
import { Coupon } from "../entities/Coupon";
import { AuthRequest } from "../middleware/isAuth";
import { paginationSchema } from "../validator/commonValidationSchemas";

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

    const couponRepo = AppDataSource.getRepository(Coupon);
    const exists = await couponRepo.findOne({ where: { code: parsed.data.code } });

    if (exists) {
      res.status(409).json({
        status: "failed",
        message: "折扣碼已存在，請使用其他代碼",
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

    const { page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    const [data, total] = await AppDataSource.getRepository(Coupon).findAndCount({
      where: {}, // TODO: 可加入 instructorId 過濾
      order: { createdAt: "DESC" },
      skip,
      take: pageSize,
      select: ["id", "couponName", "type", "code", "value", "expiresAt"],
    });

    res.status(200).json({
      status: "success",
      data: {
        couponList: data,
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
