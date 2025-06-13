import { Response, NextFunction } from "express";
import { AuthRequest } from "./isAuth";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { Order } from "../entities/Order";
import { uuidSchema } from "../validator/commonValidationSchemas";

async function checkCoursePurchase(userId: string, courseId: string): Promise<boolean> {
  const order = await AppDataSource.getRepository(Order)
    .createQueryBuilder("order")
    .where("order.user_id = :userId", { userId })
    .andWhere("order.course_id = :courseId", { courseId })
    .andWhere("order.status = :status", { status: "paid" })
    .getOne();

  return !!order;
}

export async function checkCourseAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({
        status: "failed",
        message: "課程 ID 是必填的",
      });
      return;
    }

    const parsed = uuidSchema.safeParse(courseId);

    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: parsed.error.errors[0].message });
      return;
    }

    // 檢查課程是否存在
    const course = await AppDataSource.getRepository(Course)
      .createQueryBuilder("course")
      .where("course.id = :courseId", { courseId })
      .andWhere("course.deleted_at IS NULL")
      .getOne();

    if (!course) {
      res.status(404).json({
        status: "failed",
        message: "找不到該課程",
      });
      return;
    }

    // 檢查是否已購買
    const hasPurchased = await checkCoursePurchase(userId, courseId);
    if (!hasPurchased) {
      res.status(403).json({
        status: "failed",
        message: "您尚未購買此課程",
      });
      return;
    }

    // 將課程資訊保存在 request 物件中
    req.course = course;

    next();
  } catch (error) {
    next(error);
  }
}
