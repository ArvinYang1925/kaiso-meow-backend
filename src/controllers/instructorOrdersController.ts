import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Order } from "../entities/Order";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { paginationSchema } from "../validator/commonValidationSchemas";
import { formatDate } from "../utils/dateUtils";

/**
 * API #44 GET -/api/v1/instructor/orders?page=1&pageSize=10
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-orders-page-1-pageSize-10-1d06a2468518805c8b7ece37c6db9868?pvs=4)
 *
 * 此 API 用於講師可以查看學生購買的課程訂單
 */
export async function getInstructorOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 分頁參數驗證
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const { page, pageSize } = parsed.data;
    const userId = req.user?.id;

    // 查詢講師開設的課程 ID（course.instructorId = userId）
    const courseRepository = AppDataSource.getRepository(Course);
    const instructorCourses = await courseRepository.find({
      where: { instructorId: userId },
      select: ["id"],
    });

    const courseIds = instructorCourses.map((c) => c.id);
    if (courseIds.length === 0) {
      res.status(403).json({ status: "failed", message: "查無講師所屬課程" });
      return;
    }

    // 查詢訂單資料（關聯 user, course, coupon）
    const [orders, total] = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.course", "course")
      .leftJoinAndSelect("order.coupon", "coupon")
      .where("order.courseId IN (:...courseIds)", { courseIds })
      .orderBy("order.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const orderList = orders.map((order) => ({
      id: order.id,
      name: order.user.name,
      title: order.course.title,
      originalPrice: parseFloat(order.originalPrice.toString()),
      orderPrice: parseFloat(order.orderPrice.toString()),
      status: order.status,
      couponType: order.coupon?.type ?? null,
      couponValue: order.coupon?.value !== undefined ? parseFloat(order.coupon.value.toString()) : null,
      createdAt: formatDate(order.createdAt),
      updatedAt: formatDate(order.updatedAt),
      paidAt: order.paidAt ? formatDate(order.paidAt) : null,
    }));

    res.json({
      status: "success",
      data: {
        orderList,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
