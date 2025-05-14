import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { IsNull } from "typeorm";
import { uuidSchema } from "../validator/commonValidationSchemas";

/**
 * API #11 GET /api/v1/courses?page=1&pageSize=9
 */
export async function getCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 9;
    const skip = (page - 1) * pageSize;

    const [courses, totalItems] = await AppDataSource.getRepository(Course).findAndCount({
      relations: ["instructor"],
      where: {
        deleted_at: IsNull(), // 只撈取未刪除的課程
      },
      skip,
      take: pageSize,
      order: { created_at: "DESC" },
    });

    const courseList = courses.map((course) => ({
      id: course.id,
      title: course.title,
      instructorName: course.instructor?.name || "",
      coverUrl: course.coverUrl,
      price: course.isFree ? 0 : course.price,
    }));

    const totalPages = Math.ceil(totalItems / pageSize);

    res.json({
      status: "success",
      data: {
        courseList,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages,
          totalItems,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API #12 GET /api/v1/courses/:courseId
 */
export async function getCourseDetail(req: Request, res: Response, next: NextFunction) {
  try {
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
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const course = await AppDataSource.getRepository(Course)
      .createQueryBuilder("course")
      .leftJoinAndSelect("course.instructor", "instructor")
      .leftJoinAndSelect(
        "course.sections",
        "sections",
        "sections.deleted_at IS NULL AND sections.is_published = true", // 只取未刪除且已發布的章節
      )
      .where("course.id = :courseId", { courseId })
      .andWhere("course.deleted_at IS NULL")
      .orderBy("sections.order_index", "ASC")
      .getOne();

    if (!course) {
      res.status(400).json({
        status: "error",
        message: "找不到該課程",
      });
      return;
    }

    const courseData = {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      highlight: course.highlight,
      duration: course.duration,
      isPublished: course.isPublished,
      price: course.isFree ? 0 : course.price,
      isFree: course.isFree,
      coverUrl: course.coverUrl,
      instructor: {
        id: course.instructor?.id,
        name: course.instructor?.name,
        profileUrl: course.instructor?.profileUrl,
      },
      sections:
        course.sections?.map((section) => ({
          id: section.id,
          title: section.title,
          orderIndex: section.orderIndex,
        })) || [],
    };

    res.json({
      status: "success",
      data: courseData,
    });
  } catch (error) {
    next(error);
  }
}
