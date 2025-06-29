import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import { Order } from "../entities/Order";
import { uuidSchema } from "../validator/commonValidationSchemas";
import { AuthRequest } from "../middleware/isAuth";
import { simpleQueue } from "../utils/simpleQueue";
import { deleteVideoFromFirebase } from "../utils/firebaseUtils";
import { handleVideoUploadTask } from "../services/videoTranscodeService";

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
      message: "影片已接收，正在上傳中",
      data: {
        id: section.id,
        title: section.title,
        uploadStatus: "processing",
      },
    });

    // 將上傳任務加入佇列
    simpleQueue.add(async () => {
      await handleVideoUploadTask({
        sectionId,
        tempFilePath: filePath,
        originalFilename: file.originalname,
      });
    }, sectionId);
  } catch (err) {
    next(err);
  }
}

/**
 * 檢查是否為合法的 URL 格式
 */
const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // 確保是 HTTPS URL
    if (parsedUrl.protocol !== "https:") {
      return false;
    }
    // 確保是 Firebase Storage URL
    if (!parsedUrl.hostname.includes("storage.googleapis.com")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * 解析 videoUrl 中的錯誤訊息
 */
const parseVideoUrlError = (videoUrl: string): { errorType: "transcode" | "upload" | "unknown"; message: string } => {
  // 檢查是否為已知的錯誤格式
  if (videoUrl.startsWith("轉檔失敗：")) {
    return {
      errorType: "transcode",
      message: videoUrl,
    };
  }
  if (videoUrl.startsWith("上傳失敗：")) {
    return {
      errorType: "upload",
      message: videoUrl,
    };
  }
  if (videoUrl.startsWith("處理失敗：")) {
    return {
      errorType: "unknown",
      message: videoUrl,
    };
  }

  // 如果不是已知格式，但也不是合法 URL，則視為未知錯誤
  return {
    errorType: "unknown",
    message: "影片處理失敗：無效的影片 URL 格式",
  };
};

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

    // 1. 檢查是否有明確的錯誤訊息（以 error: 開頭）
    if (section.videoUrl?.startsWith("error:")) {
      const errorMessage = section.videoUrl.replace("error:", "");
      const { errorType, message } = parseVideoUrlError(errorMessage);
      res.status(200).json({
        status: "success",
        message: "影片處理失敗",
        data: {
          uploadStatus: "failed",
          videoUrl: message,
          errorType,
        },
      });
      return;
    }

    // 2. 檢查 videoUrl 是否存在且是否為合法 URL
    if (section.videoUrl) {
      if (isValidUrl(section.videoUrl)) {
        // 合法 URL，表示轉檔上傳成功
        res.status(200).json({
          status: "success",
          message: "成功取得影片狀態",
          data: {
            uploadStatus: "completed",
            videoUrl: section.videoUrl,
          },
        });
      } else {
        // 不是合法 URL，解析可能的錯誤訊息
        const { errorType, message } = parseVideoUrlError(section.videoUrl);
        res.status(200).json({
          status: "success",
          message: "影片處理失敗",
          data: {
            uploadStatus: "failed",
            videoUrl: message,
            errorType,
          },
        });
      }
      return;
    }

    // 3. videoUrl 為 null，檢查任務狀態
    const taskInfo = simpleQueue.getTaskInfo(sectionId);
    if (taskInfo) {
      res.status(200).json({
        status: "success",
        message: "成功取得影片狀態",
        data: {
          uploadStatus: taskInfo.status === "processing" ? "processing" : "pending",
          videoUrl: null,
        },
      });
      return;
    }

    // 4. 沒有任務資訊，表示沒有影片
    res.status(200).json({
      status: "success",
      message: "成功取得影片狀態",
      data: {
        uploadStatus: "no_video",
        videoUrl: null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #52 DELETE /api/v1/instructor/sections/:sectionId/video
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/DELETE-api-v1-instructor-sections-sectionId-video-2036a246851880468493fd255cdeea14?source=copy_link)
 *
 * 此 API 用於講師可以刪除影片
 */
export async function deleteSectionVideo(req: AuthRequest, res: Response, next: NextFunction) {
  const { id: sectionId } = req.params;
  const parsed = uuidSchema.safeParse(sectionId);
  try {
    if (!parsed.success) {
      res.status(400).json({ status: "fail", message: "無效的章節ID格式" });
      return;
    }

    const instructorId = req.user?.id;
    const sectionRepo = AppDataSource.getRepository(Section);
    const section = await sectionRepo.findOne({
      where: { id: sectionId },
      relations: ["course", "progresses"],
    });

    if (!section) {
      res.status(404).json({ status: "fail", message: "找不到對應的章節" });
      return;
    }

    if (!section.videoUrl) {
      res.status(404).json({ status: "fail", message: "此章節沒有影片可刪除" });
      return;
    }

    if (section.course.instructorId !== instructorId) {
      res.status(403).json({ status: "fail", message: "您無權刪除此章節的影片" });
      return;
    }

    if (section.isPublished) {
      const orderRepo = AppDataSource.getRepository(Order);
      const orderCount = await orderRepo.count({
        where: { course: { id: section.course.id } },
      });
      const hasProgress = (section.progresses?.length || 0) > 0;

      if (orderCount > 0 || hasProgress) {
        res.status(422).json({ status: "fail", message: "章節已公開或已有觀看紀錄，無法刪除影片" });
        return;
      }
    }

    // 取得副檔名
    let ext = "";
    try {
      const url = new URL(section.videoUrl);
      const pathname = url.pathname;
      const match = pathname.match(/video(\.[a-zA-Z0-9]+)$/);
      ext = match ? match[1] : "";
    } catch {
      /* ignore */
    }

    if (ext) {
      await deleteVideoFromFirebase(section.id, ext);
    } else {
      // fallback: 若無法判斷副檔名，仍嘗試刪除 mp4
      try {
        await deleteVideoFromFirebase(section.id, ".mp4");
      } catch {
        /* ignore */
      }
    }

    await AppDataSource.query("UPDATE sections SET video_url = NULL WHERE id = $1", [section.id]);

    res.status(200).json({
      status: "success",
      data: {
        id: section.id,
        title: section.title,
        content: section.content,
        videoUrl: null,
        isPublished: section.isPublished,
      },
    });
  } catch (err) {
    next(err);
  }
}
