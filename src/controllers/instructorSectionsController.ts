import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema } from "../validator/commonValidationSchemas";
import { sectionSchema } from "../validator/sectionVaildationsechema";

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

export async function createSectionByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  const courseId = req.params.id;
  const instructorId = req.user?.id;

  const parsed = uuidSchema.safeParse(courseId);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", message: "無效的課程ID格式" });
    return;
  }

  const parsedBody = sectionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      status: "fail",
      message: parsedBody.error.errors[0]?.message || "欄位驗證錯誤",
    });
    return;
  }

  const { title } = parsedBody.data;

  try {
    const courseRepo = AppDataSource.getRepository(Course);
    const sectionRepo = AppDataSource.getRepository(Section);

    const course = await courseRepo.findOne({
      where: { id: courseId },
    });

    if (!course) {
      res.status(404).json({ status: "fail", message: "找不到指定課程" });
      return;
    }

    if (course.instructorId !== instructorId) {
      res.status(403).json({ status: "fail", message: "無權限存取" });
      return;
    }

    const maxOrder = await sectionRepo
      .createQueryBuilder("section")
      .where("section.course_id = :courseId", { courseId })
      .select("MAX(section.order_index)", "max")
      .getRawOne();

    const nextOrderIndex = (maxOrder?.max ?? 0) + 1;

    const newSection = sectionRepo.create({
      title,
      orderIndex: nextOrderIndex,
      course,
      isPublished: false,
    });

    await sectionRepo.save(newSection);

    res.status(201).json({
      status: "success",
      data: {
        id: newSection.id,
        title: newSection.title,
        courseId: course.id,
        createdAt: newSection.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
