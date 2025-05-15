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
