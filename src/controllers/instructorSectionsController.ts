import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { uuidSchema } from "../validator/commonValidationSchemas";
import { sectionSchema, updateSectionSchema, publishSectionSchema } from "../validator/sectionVaildationsechema";
import { reorderSections } from "../utils/sectionUtils";

/**
 * API #43 GET -/api/v1/instructor/courses/:courseId/sections
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-courses-courseId-sections-1d06a24685188031bb7cdd6ea6c6113f?pvs=4)
 *
 * 此 API 用於講師可以查詢某課程的所有章節列表
 */
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
      res.status(404).json({ status: "fail", message: "找不到課程" });
      return;
    }

    if (course.instructorId !== instructorId) {
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

/**
 * API #41 POST - /api/v1/instructor/courses/:courseId/sections
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-courses-courseId-sections-1d06a246851880e9b135cf4e521dfeec?pvs=4)
 *
 * 此 API 用於講師可以新增章節
 */
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

/**
 * API #39 PATCH /api/v1/instructor/sections/:sectionId
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PATCH-api-v1-instructor-sections-sectionId-1d06a246851880978816daf98305629b?pvs=4)
 *
 * 此 API 用於講師可以編輯章節內容(標題、內容）
 */
export async function updateSection(req: AuthRequest, res: Response, next: NextFunction) {
  const { id: sectionId } = req.params;
  const instructorId = req.user?.id;

  // 驗證 sectionId 格式
  const parsed = uuidSchema.safeParse(sectionId);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", message: "無效的章節ID格式" });
    return;
  }

  try {
    const bodyParse = updateSectionSchema.safeParse(req.body);
    if (!bodyParse.success) {
      res.status(400).json({
        status: "fail",
        message: "請提供有效的標題或內容",
      });
      return;
    }

    const sectionRepo = AppDataSource.getRepository(Section);
    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });

    if (!section) {
      res.status(404).json({
        status: "fail",
        message: "查無指定章節",
      });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({
        status: "fail",
        message: "無權限操作此章節",
      });
      return;
    }

    const updated = Object.assign(section, bodyParse.data);
    await sectionRepo.save(updated);

    res.status(200).json({
      status: "success",
      data: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #42 DELETE - /api/v1/instructor/sections/:sectionId
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/DELETE-api-v1-instructor-sections-sectionId-1d06a24685188029a490ed291ac1c997?pvs=4)
 *
 * 此 API 用於講師可以刪除章節
 */
export async function deleteSection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: sectionId } = req.params;
    const parsed = uuidSchema.safeParse(sectionId);

    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "無效的章節ID格式" });
      return;
    }

    const instructorId = req.user?.id;
    const sectionRepo = AppDataSource.getRepository(Section);

    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });

    if (!section) {
      res.status(400).json({ status: "fail", message: "章節不存在" });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({ status: "fail", message: "無權限存取." });
      return;
    }

    const course = section.course;

    if (section.isPublished) {
      res.status(422).json({
        status: "fail",
        message: "章節已發佈，無法刪除",
      });
      return;
    }

    if (course.isPublished) {
      res.status(422).json({
        status: "fail",
        message: "課程已發佈，無法刪除章節",
      });
      return;
    }

    if ((course.orders?.length ?? 0) > 0) {
      res.status(422).json({
        status: "fail",
        message: "已有學生購買此課程，無法刪除章節",
      });
      return;
    }

    if ((course.progresses?.length ?? 0) > 0) {
      res.status(422).json({
        status: "fail",
        message: "已有學生觀看紀錄，無法刪除章節",
      });
      return;
    }

    const courseId = section.course.id;
    await sectionRepo.remove(section);
    await reorderSections(courseId);

    res.status(200).json({
      status: "success",
      message: "章節已成功刪除",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #40 PATCH /api/v1/instructor/sections/:sectionId/publish
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PATCH-api-v1-instructor-sections-sectionId-publish-1d06a24685188001bc2fe412de9528a2?pvs=4)
 *
 * 此 API 用於講師發佈/取消發佈章節
 */
export async function publishSection(req: AuthRequest, res: Response, next: NextFunction) {
  const { id: sectionId } = req.params;
  const instructorId = req.user?.id;

  const parsed = uuidSchema.safeParse(sectionId);
  if (!parsed.success) {
    res.status(400).json({ status: "fail", message: "無效的章節ID格式" });
    return;
  }

  const bodyResult = publishSectionSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({
      status: "fail",
      message: "isPublished 欄位格式錯誤，必須為 true 或 false",
    });
    return;
  }

  try {
    const sectionRepo = AppDataSource.getRepository(Section);

    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });

    if (!section) {
      res.status(404).json({
        status: "fail",
        message: "指定章節不存在",
      });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({
        status: "fail",
        message: "無權限存取",
      });
      return;
    }

    section.isPublished = bodyResult.data.isPublished;
    await sectionRepo.save(section);

    res.status(200).json({
      status: "success",
      data: {
        id: section.id,
        title: section.title,
        isPublished: section.isPublished,
      },
    });
  } catch (err) {
    next(err);
  }
}
