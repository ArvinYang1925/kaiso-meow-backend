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
      res.status(400).json({ status: "fail", message: "無效的章節ID格式" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ status: "fail", message: "請上傳影片檔案" });
      return;
    }

    const instructorId = req.user?.id;
    const sectionRepo = AppDataSource.getRepository(Section);
    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });
    if (!section) {
      res.status(404).json({ status: "fail", message: "找不到此章節" });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({ status: "fail", message: "無權限操作此章節" });
      return;
    }

    const filePath = file.path;

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
    }, sectionId);
  } catch (err) {
    next(err);
  }
}

/**
 * API #38 GET /api/v1/instructor/sections/:sectionId/video/status
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-sections-sectionId-video-status-1d06a246851880b3ba7bdfdeb74a72a8?source=copy_link)
 *
 * 此 API 用於講師可以查詢轉檔狀態
 */
export async function getVideoStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: sectionId } = req.params;
    const parsed = uuidSchema.safeParse(sectionId);
    if (!parsed.success) {
      res.status(400).json({
        status: "fail",
        message: "無效的章節ID格式",
        data: null,
      });
      return;
    }

    const instructorId = req.user?.id;
    const sectionRepo = AppDataSource.getRepository(Section);
    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course"],
    });

    if (!section) {
      res.status(404).json({
        status: "fail",
        message: "找不到章節",
        data: null,
      });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({
        status: "fail",
        message: "無權限查詢此章節",
        data: null,
      });
      return;
    }

    // 檢查 videoUrl 是否包含錯誤訊息
    if (section.videoUrl?.startsWith("error:")) {
      const errorMessage = section.videoUrl.replace("error:", "");
      res.status(200).json({
        status: "success",
        message: "影片處理失敗",
        data: {
          uploadStatus: "failed",
          videoUrl: errorMessage,
          errorType: errorMessage.startsWith("轉檔失敗") ? "transcode" : errorMessage.startsWith("上傳失敗") ? "upload" : "unknown",
        },
      });
      return;
    }

    // 正常狀態回應
    res.status(200).json({
      status: "success",
      message: "成功取得影片狀態",
      data: {
        uploadStatus: section.videoUrl ? "completed" : "processing",
        videoUrl: section.videoUrl || null,
      },
    });
  } catch (err) {
    next(err);
  }
}
