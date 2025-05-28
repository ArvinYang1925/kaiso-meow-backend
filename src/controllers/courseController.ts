import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { Section } from "../entities/Section";
import { StudentProgress } from "../entities/StudentProgress";
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

// API #21 Code Review Start

/**
 * API #21 GET /api/v1/courses/:courseId/sections
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-courseId-sections-1d06a246851880398989f3606961d628?pvs=4)
 *
 * 此 API 取得指定課程的所有章節列表，根據章節順序排序
 */
export async function getCourseSections(req: Request, res: Response, next: NextFunction) {
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

    const sections = await AppDataSource.getRepository(Section)
      .createQueryBuilder("section")
      .where("section.course_id = :courseId", { courseId })
      .andWhere("section.deleted_at IS NULL")
      .andWhere("section.is_published = true")
      .orderBy("section.order_index", "ASC")
      .getMany();

    res.status(200).json({
      status: "success",
      message: "成功取得該課程的章節清單",
      data: {
        course: {
          id: course.id,
          title: course.title,
        },
        sections: sections.map((section) => ({
          id: section.id,
          title: section.title,
          order: section.orderIndex,
          content: section.content,
          videoUrl: section.videoUrl,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

// API #21 Code Review End

// API #22 Code Review Start

/**
 * API #22 GET /api/v1/courses/:courseId/progress
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-courseId-progress-1d06a24685188007b5b6fac93880b048?pvs=4)
 *
 * 此 API 取得當前用戶在指定課程的學習進度
 */
export async function getCourseProgress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    // 驗證課程ID是否有效
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

    // 驗證課程是否存在
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

    // 取得課程總章節數
    const totalSections = await AppDataSource.getRepository(Section)
      .createQueryBuilder("section")
      .where("section.course_id = :courseId", { courseId })
      .andWhere("section.deleted_at IS NULL")
      .andWhere("section.is_published = true")
      .getCount();

    // 取得已完成的章節數
    const completedSections = await AppDataSource.getRepository(StudentProgress)
      .createQueryBuilder("progress")
      .where("progress.user_id = :userId", { userId })
      .andWhere("progress.course_id = :courseId", { courseId })
      .andWhere("progress.is_completed = true")
      .getCount();

    // 計算完成進度百分比
    const percentage = totalSections > 0 ? parseFloat(((completedSections / totalSections) * 100).toFixed(2)) : 0;

    // 取得進度記錄
    const progressRecord = await AppDataSource.getRepository(StudentProgress)
      .createQueryBuilder("progress")
      .where("progress.user_id = :userId", { userId })
      .andWhere("progress.course_id = :courseId", { courseId })
      .getOne();

    const progressId = progressRecord ? progressRecord.id : null;

    res.status(200).json({
      status: "success",
      message: "成功取得章節進度",
      data: {
        progress: {
          id: progressId,
          courseId,
          totalSections,
          completedSections,
          percentage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// API #22 Code Review End

/**
 * API #23 PATCH /api/v1/courses/:courseId/sections/:sectionId/complete
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PATCH-api-v1-courses-courseId-sections-sectionId-complete-1d06a246851880bfb699fe79039e08a8?pvs=4)
 *
 * 此 API 標記章節為已完成，將資料庫欄位 student_progress is_completed 設為 true
 */
export async function markSectionComplete(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId, sectionId } = req.params;
    const userId = req.user?.id;

    // 驗證課程ID是否有效
    if (!courseId) {
      res.status(400).json({
        status: "failed",
        message: "課程 ID 是必填的",
      });
      return;
    }

    const parsedCourseId = uuidSchema.safeParse(courseId);
    if (!parsedCourseId.success) {
      const err = parsedCourseId.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    // 驗證章節ID是否有效
    if (!sectionId) {
      res.status(400).json({
        status: "failed",
        message: "章節 ID 是必填的",
      });
      return;
    }

    const parsedSectionId = uuidSchema.safeParse(sectionId);
    if (!parsedSectionId.success) {
      const err = parsedSectionId.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    // 驗證課程是否存在
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

    // 驗證章節是否存在且屬於該課程
    const section = await AppDataSource.getRepository(Section)
      .createQueryBuilder("section")
      .where("section.id = :sectionId", { sectionId })
      .andWhere("section.course_id = :courseId", { courseId })
      .andWhere("section.deleted_at IS NULL")
      .andWhere("section.is_published = true")
      .getOne();

    if (!section) {
      res.status(404).json({
        status: "failed",
        message: "找不到該章節或章節不屬於此課程",
      });
      return;
    }

    // 查找現有的進度記錄
    const existingProgress = await AppDataSource.getRepository(StudentProgress)
      .createQueryBuilder("progress")
      .where("progress.user_id = :userId", { userId })
      .andWhere("progress.course_id = :courseId", { courseId })
      .andWhere("progress.section_id = :sectionId", { sectionId })
      .getOne();

    if (!existingProgress) {
      res.status(404).json({
        status: "failed",
        message: "找不到進度記錄",
      });
      return;
    }

    // 如果已經完成，直接返回成功
    if (existingProgress.isCompleted) {
      res.status(200).json({
        status: "success",
        message: "章節已標記為完成",
        data: {
          progressId: existingProgress.id,
          isCompleted: true,
        },
      });
      return;
    }

    // 更新現有記錄為已完成
    await AppDataSource.getRepository(StudentProgress)
      .createQueryBuilder()
      .update(StudentProgress)
      .set({ isCompleted: true })
      .where("id = :id", { id: existingProgress.id })
      .execute();

    res.status(200).json({
      status: "success",
      message: "章節已標記為完成",
      data: {
        progressId: existingProgress.id,
        isCompleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
}
