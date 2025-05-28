import { Response, NextFunction } from "express";
import { createCourseSchema, updateCourseSchema, publishCourseSchema } from "../validator/courseVaildationschema";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema, paginationSchema } from "../validator/commonValidationSchemas";
import { IsNull } from "typeorm";
import { Order } from "../entities/Order";
import { bucket } from "../utils/firebaseUtils";
import path from "path";

/**
 * API #32 POST - /api/v1/instructor/courses
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-courses-1d06a246851880dbb93ec6fa0f903175?pvs=4)
 *
 * 此 API 講師可以創建課程
 */
export async function createCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = createCourseSchema.safeParse(req.body);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const userId = req.user?.id;

    const { title, subtitle, description, highlight, duration, price, isFree, coverUrl } = result.data;
    const courseRepo = AppDataSource.getRepository(Course);
    const existingCourse = await courseRepo.findOne({ where: { title } });
    if (existingCourse) {
      res.status(400).json({
        status: "failed",
        message: "課程標題已存在，請使用其他名稱",
      });
      return;
    }
    const course = courseRepo.create({
      title,
      subtitle,
      description,
      highlight,
      duration,
      price: isFree ? 0 : price,
      isFree,
      coverUrl,
      instructorId: userId, // ✅ 因為 courses 表的 FK 綁定的是 users.id
      isPublished: false,
    });

    await courseRepo.save(course);

    res.status(200).json({
      status: "success",
      message: "課程建立成功",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #34 GET -/api/v1/instructor/courses/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-courses-id-1d06a24685188062a63cdb2f97aa9d1a?pvs=4)
 *
 * 此 API 讓講師可以查看單一課程詳細資訊
 */
export async function getCourseDetailByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const courseId = req.params.id;
    const parsed = uuidSchema.safeParse(courseId);

    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "無效的課程ID格式" });
      return;
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: courseId },
    });

    if (!course) {
      res.status(404).json({
        status: "failed",
        message: "找不到指定課程",
      });
      return;
    }

    if (course.instructorId !== userId) {
      res.status(403).json({
        status: "failed",
        message: "權限不足",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "課程資訊取得成功",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #35 PUT - /api/v1/instructor/courses/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PUT-api-v1-instructor-courses-id-1d06a2468518803f91d3fea0da7273c0?pvs=4)
 *
 * 此 API 讓講師可以編輯課程
 */
export async function updateCourseByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = updateCourseSchema.safeParse(req.body);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const userId = req.user?.id;
    const courseId = req.params.id;
    const parsed = uuidSchema.safeParse(courseId);

    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "無效的課程ID格式" });
      return;
    }
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId } });

    if (!course) {
      res.status(404).json({ status: "failed", message: "找不到指定課程" });
      return;
    }

    if (course.instructorId !== userId) {
      res.status(403).json({ status: "failed", message: "權限不足" });
      return;
    }

    const { title, subtitle, description, highlight, duration, price, isFree, coverUrl } = result.data;
    const existingCourse = await courseRepo.findOne({ where: { title } });

    if (existingCourse && existingCourse.id !== course.id) {
      res.status(400).json({
        status: "failed",
        message: "課程標題已存在，請使用其他名稱",
      });
      return;
    }

    course.title = title;
    course.subtitle = subtitle;
    course.description = description;
    course.highlight = highlight;
    course.duration = duration;
    course.isFree = isFree;
    course.price = isFree ? 0 : price;
    course.coverUrl = coverUrl;

    await courseRepo.save(course);

    res.status(200).json({
      status: "success",
      message: "課程更新成功",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #31 GET -/api/v1/instructor/courses?page=1&pageSize=10
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-courses-page-1-pageSize-10-1d06a2468518803faf6cfba7982c7469?pvs=4)
 *
 * 此 API 講師可以瀏覽課程列表
 */
export async function getCoursesByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = paginationSchema.safeParse(req.query);

    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const { page, pageSize } = parsed.data;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "failed", message: "請先登入" });
      return;
    }

    const courseRepo = AppDataSource.getRepository(Course);

    const [courses, totalItems] = await courseRepo
      .createQueryBuilder("course")
      .leftJoin("course.orders", "order")
      .where("course.instructorId = :userId", { userId })
      .andWhere("course.deleted_at IS NULL")
      .loadRelationCountAndMap("course.studentCount", "course.orders", "order", (qb) =>
        qb.where("order.status = :status", { status: "paid" }),
      )
      .orderBy("course.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const courseList = courses.map((course) => {
      const { id, title, coverUrl, isFree, price, isPublished, created_at } = course;

      const studentCount = (course as unknown as { studentCount?: number }).studentCount ?? 0;

      return {
        id,
        title,
        coverUrl,
        isFree,
        price,
        isPublished,
        studentCount,
        createdAt: created_at,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        courseList,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          totalItems,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #49 PATCH - /api/v1/instructor/courses/:id/publish
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PATCH-api-v1-instructor-courses-id-publish-1f86a2468518804c9813f3738fbf14a2?pvs=4)
 *
 * 此 API 講師可以上架/下架課程
 */
export async function toggleCoursePublishStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: courseId } = req.params;
    const instructorId = req.user?.id;
    const parsed = uuidSchema.safeParse(courseId);
    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "無效的課程ID格式" });
      return;
    }

    const parseResult = publishCourseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: "fail",
        message: "欄位格式錯誤：" + parseResult.error.issues[0].message,
      });
      return;
    }

    const { isPublished } = parseResult.data;
    const courseRepo = AppDataSource.getRepository(Course);

    const course = await courseRepo.findOne({
      where: {
        id: courseId,
        instructorId,
        deleted_at: IsNull(),
      },
    });

    if (!course) {
      res.status(404).json({
        status: "fail",
        message: "找不到指定課程，請確認 courseId 是否正確",
      });
      return;
    }

    if (course.isPublished === isPublished) {
      res.status(409).json({
        status: "fail",
        message: `操作無效：課程目前已為 ${isPublished ? "上架" : "下架"} 狀態`,
      });
      return;
    }

    course.isPublished = isPublished;
    await courseRepo.save(course);

    res.status(200).json({
      status: "success",
      data: {
        courseId: course.id,
        isPublished: course.isPublished,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #36 DELETE - /api/v1/instructor/courses/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/DELETE-api-v1-instructor-courses-id-1d06a2468518805887c9fff368d035e0?pvs=4)
 *
 * 此 API 讓講師可以刪除課程，但若課程已上架或已有學生購買則無法刪除
 */
export async function deleteCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const courseId = req.params.id;
    const userId = req.user?.id;
    const parsed = uuidSchema.safeParse(courseId);

    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "課程 ID 格式錯誤" });
      return;
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: courseId, deleted_at: IsNull() },
    });

    if (!course) {
      res.status(404).json({ status: "failed", message: "找不到指定課程" });
      return;
    }

    if (course.instructorId !== userId) {
      res.status(403).json({ status: "failed", message: "權限不足" });
      return;
    }

    if (course.isPublished) {
      res.status(400).json({ status: "failed", message: "已上架的課程不能刪除，請先將課程下架" });
      return;
    }

    // 檢查課程是否有學生購買
    const orderRepo = AppDataSource.getRepository(Order);
    const hasOrders = await orderRepo.findOne({
      where: {
        courseId: courseId,
        status: "paid",
      },
    });

    if (hasOrders) {
      res.status(400).json({ status: "failed", message: "已有學生購買的課程不能刪除" });
      return;
    }

    await courseRepo.softRemove(course);

    res.status(200).json({
      status: "success",
      message: "課程已成功刪除",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #33 POST /api/v1/instructor/uploads/cover
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-uploads-cover-1d06a2468518804cb37dd8410e05519f?pvs=4)
 *
 * 此 API 讓講師可上傳課程封面圖片
 */
export async function uploadCourseCover(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 檢查是否上傳圖片
    if (!req.file) {
      res.status(400).json({ status: "failed", message: "請選擇要上傳的圖片檔案" });
      return;
    }

    // 上傳圖片
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const remotePath = `images/course_cover/course-${timestamp}${ext}`;
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

        res.status(200).json({
          status: "success",
          message: "課程封面上傳成功",
          data: { coverUrl: publicUrl },
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
