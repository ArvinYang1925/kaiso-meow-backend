import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { Section } from "../entities/Section";
import { StudentProgress } from "../entities/StudentProgress";
import { IsNull } from "typeorm";
import { uuidSchema } from "../validator/commonValidationSchemas";
import { Order } from "../entities/Order";

/**
 * API #11 GET /api/v1/courses?page=1&pageSize=9
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-page-1-pageSize-9-1d06a24685188029bb28fd7325658b3d?source=copy_link)
 *
 * 此 API 用於獲取課程列表，支援分頁功能
 */
export async function getCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 9;
    const skip = (page - 1) * pageSize;

    const [courses, totalItems] = await AppDataSource.getRepository(Course).findAndCount({
      relations: ["instructor"],
      where: {
        deleted_at: IsNull(),
        isPublished: true, // 只撈取未刪除且已發布的課程
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
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-courseId-1d06a2468518807abb1ce0e0f3bd92b0?source=copy_link)
 *
 * 此 API 用於獲取單一課程的詳細資訊
 */
export async function getCourseDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

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

    let isPurchased = false;
    // 如果使用者已登入，檢查是否已購買課程
    if (userId) {
      const purchasedOrder = await AppDataSource.getRepository(Order)
        .createQueryBuilder("order")
        .where("order.user_id = :userId", { userId })
        .andWhere("order.course_id = :courseId", { courseId })
        .andWhere("order.status = :status", { status: "paid" }) // 只檢查已支付的訂單
        .getOne();

      isPurchased = !!purchasedOrder;
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
      isPurchased,
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

/**
 * API #21 GET /api/v1/courses/:courseId/sections
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-courseId-sections-1d06a246851880398989f3606961d628?pvs=4)
 *
 * 此 API 取得指定課程的所有章節列表，根據章節順序排序
 */
export async function getCourseSections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId } = req.params;
    const course = req.course;

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
          id: course!.id,
          title: course!.title,
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
    const userId = req.user!.id;
    const course = req.course;

    // 取得課程總章節數
    const totalSections = await AppDataSource.getRepository(Section)
      .createQueryBuilder("section")
      .where("section.course_id = :courseId", { courseId })
      .andWhere("section.deleted_at IS NULL")
      .andWhere("section.is_published = true")
      .getCount();

    // 取得已完成的章節數（只計算已發布的章節）
    const completedSections = await AppDataSource.getRepository(StudentProgress)
      .createQueryBuilder("progress")
      .innerJoin("progress.section", "section")
      .where("progress.user_id = :userId", { userId })
      .andWhere("progress.course_id = :courseId", { courseId: course!.id })
      .andWhere("progress.is_completed = true")
      .andWhere("section.is_published = true")
      .andWhere("section.deleted_at IS NULL")
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

/**
 * API #25 PATCH /api/v1/courses/:courseId/sections/:sectionId/complete
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PATCH-api-v1-courses-courseId-sections-sectionId-complete-1d06a246851880bfb699fe79039e08a8?pvs=4)
 *
 * 此 API 標記章節為已完成，將資料庫欄位 student_progress is_completed 設為 true
 */
export async function markSectionComplete(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId, sectionId } = req.params;
    const userId = req.user!.id;

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

    let progressId: string;

    if (!existingProgress) {
      // 如果沒有進度記錄，新增一筆並設為已完成
      const savedProgress = await AppDataSource.getRepository(StudentProgress).save({
        user: { id: userId },
        course: { id: courseId },
        section: { id: sectionId },
        isCompleted: true,
      });
      progressId = savedProgress.id;
    } else {
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

      progressId = existingProgress.id;
    }

    res.status(200).json({
      status: "success",
      message: "章節已標記為完成",
      data: {
        progressId,
        isCompleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API #24 GET /api/v1/courses/:courseId/sections/:sectionId
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-courseId-sections-sectionId-1d06a246851880d0986dc604b538e99c?source=copy_link)
 *
 * 此 API 用於學生查看特定章節的詳細內容，包括影片和文字內容，
 * 同時會返回前後章節的資訊以便導航，以及學習進度
 */
export async function getSectionDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId, sectionId } = req.params;
    const userId = req.user!.id;
    const course = req.course;

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

    // 取得該課程所有已發布章節，並按順序排列
    const allSections = await AppDataSource.getRepository(Section)
      .createQueryBuilder("section")
      .where("section.course_id = :courseId", { courseId })
      .andWhere("section.deleted_at IS NULL")
      .andWhere("section.is_published = true")
      .orderBy("section.order_index", "ASC")
      .getMany();

    if (allSections.length === 0) {
      res.status(404).json({
        status: "failed",
        message: "課程尚未有任何章節或章節都沒發佈",
      });
      return;
    }

    // 查找當前章節
    const currentSection = allSections.find((section) => section.id === sectionId);

    if (!currentSection) {
      res.status(404).json({
        status: "failed",
        message: "找不到該章節或章節不屬於此課程",
      });
      return;
    }

    // 查找前後章節
    const currentIndex = allSections.findIndex((section) => section.id === sectionId);
    const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
    const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

    // 查詢學習進度
    let progress = { isCompleted: false };

    if (userId) {
      const progressRecord = await AppDataSource.getRepository(StudentProgress)
        .createQueryBuilder("progress")
        .where("progress.user_id = :userId", { userId })
        .andWhere("progress.course_id = :courseId", { courseId })
        .andWhere("progress.section_id = :sectionId", { sectionId })
        .getOne();

      if (progressRecord) {
        progress = { isCompleted: progressRecord.isCompleted };
      }
    }

    // 組織回傳資料
    const sectionData = {
      id: currentSection.id,
      title: currentSection.title,
      content: currentSection.content,
      videoUrl: currentSection.videoUrl,
      courseId: courseId,
      courseName: course!.title,
      order: currentSection.orderIndex,
      progress,
      nextSection: nextSection ? { id: nextSection.id, title: nextSection.title } : null,
      prevSection: prevSection ? { id: prevSection.id, title: prevSection.title } : null,
    };

    res.status(200).json({
      status: "success",
      message: "成功取得章節資料",
      data: {
        section: sectionData,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API #20 GET -/api/v1/courses/my-learning?page=1&pageSize=9
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-courses-my-learning-page-1-pageSize-9-1d06a246851880d1b046fef844ac7cf3?source=copy_link)
 *
 * 此 API 用於學生查看正在學習的課程清單
 */
export async function getMyLearningCourses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: "failed",
        message: "未授權，請重新登入",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 9;
    const skip = (page - 1) * pageSize;

    // 1. 從訂單表中獲取該學生已購買的課程 ID
    const purchasedCoursesIds = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .select("DISTINCT order.course_id", "courseId")
      .where("order.user_id = :userId", { userId })
      .andWhere("order.status = :status", { status: "paid" }) // 只取已支付的訂單
      .getRawMany();

    if (purchasedCoursesIds.length === 0) {
      res.status(200).json({
        status: "success",
        message: "成功取得學習課程資料",
        data: [],
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: 0,
          totalItems: 0,
        },
      });
      return;
    }

    const courseIds = purchasedCoursesIds.map((item) => item.courseId);

    // 2. 查詢課程詳細資料
    const [courses, totalItems] = await AppDataSource.getRepository(Course)
      .createQueryBuilder("course")
      .leftJoinAndSelect("course.instructor", "instructor")
      .where("course.id IN (:...courseIds)", { courseIds })
      .andWhere("course.deleted_at IS NULL")
      .skip(skip)
      .take(pageSize)
      .orderBy("course.created_at", "DESC")
      .getManyAndCount();

    // 3. 計算每個課程的進度
    const progressPromises = courses.map(async (course) => {
      // 獲取課程總章節數
      const totalSections = await AppDataSource.getRepository(Section)
        .createQueryBuilder("section")
        .where("section.course_id = :courseId", { courseId: course.id })
        .andWhere("section.deleted_at IS NULL")
        .andWhere("section.is_published = true")
        .getCount();

      // 獲取已完成的章節數（只計算已發布的章節）
      const completedSections = await AppDataSource.getRepository(StudentProgress)
        .createQueryBuilder("progress")
        .innerJoin("progress.section", "section")
        .where("progress.user_id = :userId", { userId })
        .andWhere("progress.course_id = :courseId", { courseId: course.id })
        .andWhere("progress.is_completed = true")
        .andWhere("section.is_published = true")
        .andWhere("section.deleted_at IS NULL")
        .getCount();

      // 計算完成進度百分比
      const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

      // 添加 isReady 參數
      const isReady = totalSections > 0;

      return {
        courseId: course.id,
        title: course.title,
        coverUrl: course.coverUrl,
        progressPercentage,
        instructorName: course.instructor?.name || "",
        isReady, // 新增的參數
      };
    });

    const learningCourses = await Promise.all(progressPromises);
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
      status: "success",
      message: "成功取得學習課程資料",
      data: learningCourses,
      pagination: {
        currentPage: page,
        pageSize,
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
}
