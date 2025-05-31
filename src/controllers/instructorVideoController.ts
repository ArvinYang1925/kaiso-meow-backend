import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import { uuidSchema } from "../validator/commonValidationSchemas";
import { AuthRequest } from "../middleware/isAuth";
import { simpleQueue } from "../utils/simpleQueue";
import { handleVideoTranscodeTask } from "../services/videoTranscodeService";

/**
 * API #37 POST /api/v1/instructor/sections/:sectionId/video
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-instructor-sections-sectionId-video-1d06a2468518808f929ceb69ec9aede8?source=copy_link)
 *
 * 此 API 用於講師可以上傳影片
 */
export async function uploadVideo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: sectionId } = req.params;
    const parsed = uuidSchema.safeParse(sectionId);
    if (!parsed.success) {
      res.status(400).json({ status: "failed", message: "無效的章節ID格式" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ status: "fail", message: "請上傳影片檔案" });
      return;
    }

    const instructorId = req.user?.id;
    const sectionRepo = AppDataSource.getRepository(Section);
    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });

    if (!section || section.course.instructorId !== instructorId) {
      res.status(403).json({ status: "fail", message: "無權限操作此章節" });
      return;
    }
    const filePath = req.file?.path;

    if (!filePath) {
      res.status(400).json({ status: "fail", message: "找不到上傳影片檔案" });
      return;
    }

    res.status(202).json({
      status: "success",
      message: "影片已接收，正在轉檔中",
      data: {
        id: section.id,
        title: section.title,
        uploadStatus: "processing",
      },
    });
    simpleQueue.add(async () => {
      await handleVideoTranscodeTask({ sectionId, tempFilePath: filePath });
    });
  } catch (err) {
    next(err);
  }
}
