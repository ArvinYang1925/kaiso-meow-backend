import { Response, NextFunction } from "express";
import { createCourseSchema, updateCourseSchema } from "../validator/courseVaildationschema";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema } from "../validator/commonValidationSchemas";

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
