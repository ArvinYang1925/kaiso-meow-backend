import { Response, NextFunction } from "express";
import { CreateCourseSchema } from "../validator/courseVaildationschema";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";

export async function createCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = CreateCourseSchema.safeParse(req.body);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const userId = req.user?.id;

    const { title, subtitle, description, highlight, duration, price, isFree, coverUrl } = result.data;

    const courseRepo = AppDataSource.getRepository(Course);
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

export async function getCourseDetailByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const courseId = req.params.id;

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
