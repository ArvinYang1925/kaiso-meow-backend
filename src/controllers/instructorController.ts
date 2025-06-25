import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Instructor } from "../entities/Instructor";
import { AuthRequest } from "../middleware/isAuth";
import { User } from "../entities/User";
import { Order } from "../entities/Order";
import { updateInstructorProfileSchema } from "../validator/authValidationSchemas";
import { paginationSchema } from "../validator/commonValidationSchemas";
import { revenueReportSchema } from "../validator/revenueValidationSchema";
import { bucket } from "../utils/firebaseUtils";
import path from "path";
import { groupOrdersByInterval, formatRevenueData, calculateRevenueSummary } from "../utils/revenueUtils";
import { formatDate } from "../utils/dateUtils";

/**
 * API #26 GET /api/v1/instructor/me
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-me-1d06a24685188015af74cda2e2097341?source=copy_link)
 *
 * 此 API 用於獲取講師個人資料
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id || req.user.role !== "instructor") {
      res.status(400).json({
        status: "fail",
        message: "無效的身分資訊，請重新登入",
      });
      return;
    }
    const instructorRepo = AppDataSource.getRepository(Instructor);
    const instructor = await instructorRepo.findOne({
      where: { userId: req.user?.id },
      relations: ["user"],
    });

    if (!instructor) {
      res.status(400).json({
        status: "failed",
        message: "找不到講師資料",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "取得講師資料成功",
      data: {
        id: instructor!.id,
        name: instructor!.user.name,
        email: instructor!.user.email,
        profileUrl: instructor!.user.profileUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #27 PUT /api/v1/instructor/me
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PUT-api-v1-instructor-me-1d06a24685188079973afaa4ba946214?source=copy_link)
 *
 * 此 API 用於更新講師個人資料
 */
export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = updateInstructorProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { name, avatar } = parsed.data;
    const instructorRepo = AppDataSource.getRepository(Instructor);
    const instructor = await instructorRepo.findOne({
      where: { userId: req.user?.id },
      relations: ["user"],
    });

    if (!instructor) {
      res.status(404).json({
        status: "failed",
        message: "找不到講師資料",
      });
      return;
    }

    instructor.user.name = name;
    instructor.user.profileUrl = avatar;
    await AppDataSource.getRepository(User).save(instructor.user);

    res.status(200).json({
      status: "success",
      message: "個人資料更新成功",
      data: {
        name: instructor.user.name,
        email: instructor.user.email,
        avatar: instructor.user.profileUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #28 POST /api/v1/instructor/upload/avatar
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructors-upload-avatar-1d06a2468518807780d6fdf76e310be7?pvs=4)
 *
 * 此 API 讓講師可上傳大頭照
 */
export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 檢查是否上傳圖片
    if (!req.file) {
      res.status(400).json({ status: "failed", message: "請選擇要上傳的圖片檔案" });
      return;
    }

    // 檢查講師資料
    const instructorRepo = AppDataSource.getRepository(Instructor);
    const instructor = await instructorRepo.findOne({
      where: { userId: req.user?.id },
      relations: ["user"],
    });
    if (!instructor) {
      res.status(404).json({ status: "failed", message: "找不到講師資料" });
      return;
    }

    // 上傳圖片
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const remotePath = `images/instructor_avatar/instructor-${instructor.id}-${timestamp}${ext}`;
    const file = bucket.file(remotePath);

    // 上傳檔案
    const stream = file.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    // 錯誤處理
    stream.on("error", (err) => next(err));

    // 上傳完成
    stream.on("finish", async () => {
      try {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remotePath}`;

        instructor.user.profileUrl = publicUrl;
        await AppDataSource.getRepository(User).save(instructor.user);

        res.status(200).json({
          status: "success",
          message: "講師大頭貼上傳成功",
          data: { avatarUrl: publicUrl },
        });
      } catch (err) {
        next(err);
      }
    });

    stream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * API #45 GET -/api/v1/instructor/students?page=1&pageSize=10
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-students-page-1-pageSize-10-1d06a2468518802d84d2d41e76ecd1f0?pvs=4)
 *
 * 此 API 讓講師可在後台查看學生資料，包括：姓名、email、電話號碼
 */
export async function getStudentsByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const result = paginationSchema.safeParse(req.query);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const { page, pageSize } = result.data;

    // 查詢學生清單
    const [students, total] = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .innerJoin("user.orders", "order")
      .innerJoin("order.course", "course")
      .leftJoinAndSelect("user.student", "student") // 抓 phoneNumber
      .where("course.instructorId = :instructorId", { instructorId: userId })
      .andWhere("user.role = :role", { role: "student" })
      .andWhere("order.paidAt IS NOT NULL")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy("user.createdAt", "DESC")
      .getManyAndCount();

    // 組裝資料
    const formatted = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phoneNumber: s.student?.phoneNumber || "",
      createdAt: formatDate(s.createdAt),
      updatedAt: formatDate(s.updatedAt),
    }));

    res.status(200).json({
      status: "success",
      data: {
        studentList: formatted,
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

/**
 * API #30 GET /api/v1/instructor/revenue?startTime=2024-01-01&endTime=2024-01-31&interval=day&courseId=uuid
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-revenue-startTime-endTime-interval-courseId-1d06a246851880aba774ea3225cdddec?pvs=4)
 *
 * 此 API 讓講師可查看收益報表，支援不同時間間隔和課程篩選
 */
export async function getInstructorRevenue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    // 驗證查詢參數
    const result = revenueReportSchema.safeParse(req.query);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const { startTime, endTime, interval, courseId } = result.data;

    // 調整結束時間到當天的 23:59:59
    const adjustedEndTime = new Date(endTime);
    adjustedEndTime.setHours(23, 59, 59, 999);

    // 建立基礎查詢 - 先獲取所有符合條件的訂單
    let query = AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .innerJoin("order.course", "course")
      .where("course.instructorId = :instructorId", { instructorId: userId })
      .andWhere("order.status = :status", { status: "paid" })
      .andWhere("order.paidAt IS NOT NULL")
      .andWhere("order.paidAt >= :startTime", { startTime })
      .andWhere("order.paidAt <= :endTime", { endTime: adjustedEndTime })
      .orderBy("order.paidAt", "ASC");

    // 如果指定了課程 ID，加入課程篩選
    if (courseId) {
      query = query.andWhere("order.courseId = :courseId", { courseId });
    }

    // 獲取所有符合條件的訂單
    const allOrders = await query.select(["order.id", "order.orderPrice", "order.paidAt", "order.courseId"]).getMany();

    if (courseId && allOrders.length === 0) {
      res.status(408).json({
        status: "failed",
        message: `找不到課程 ID 為 ${courseId} 的訂單。`,
      });
      return;
    }

    // 如果沒有訂單，直接返回空結果
    if (allOrders.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          summary: {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
          },
          revenueData: [],
          queryParams: {
            startTime: startTime.toISOString(),
            endTime: adjustedEndTime.toISOString(),
            interval,
            courseId: courseId || null,
          },
        },
      });
      return;
    }

    // 使用 utils 處理資料分組和格式化
    const groupedData = groupOrdersByInterval(allOrders, interval);
    const formattedData = formatRevenueData(groupedData, interval);
    const summary = calculateRevenueSummary(allOrders);

    res.status(200).json({
      status: "success",
      data: {
        summary,
        revenueData: formattedData,
        queryParams: {
          startTime: startTime.toISOString(),
          endTime: adjustedEndTime.toISOString(),
          interval,
          courseId: courseId || null,
        },
      },
    });
  } catch (err) {
    console.error("Revenue calculation error:", err);
    next(err);
  }
}
