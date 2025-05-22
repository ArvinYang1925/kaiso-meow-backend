import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema } from "../validator/commonValidationSchemas";

export async function getCourseSectionsByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  const courseId = req.params.id;

  const parsed = uuidSchema.safeParse(courseId);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", message: "無效的課程ID格式" });
    return;
  }

  const instructorId = req.user?.id;
  if (!instructorId) {
    res.status(401).json({ status: "fail", message: "未授權，請重新登入" });
    return;
  }

  try {
    const course = await AppDataSource.getRepository(Course).findOne({
      where: {
        id: parsed.data,
        instructorId: instructorId,
      },
    });

    if (!course) {
      res.status(403).json({ status: "fail", message: "無權限存取此課程" });
      return;
    }

    const sections = await AppDataSource.getRepository(Section).find({
      where: { course: { id: course.id } },
      order: { orderIndex: "ASC" },
    });

    const sectionList = sections.map((section) => ({
      id: section.id,
      title: section.title,
      content: section.content,
      videoUrl: section.videoUrl,
      isPublished: section.isPublished,
      order: section.orderIndex,
    }));

    res.status(200).json({
      status: "success",
      data: sectionList,
    });
  } catch (err) {
    next(err);
  }
}
