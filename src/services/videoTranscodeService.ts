// src/services/videoTranscodeService.ts
import { transcodeToMultiQuality } from "../queues/processors/ffmpegHelpers";
import { uploadHLSFolderToFirebase, uploadVideoToFirebase } from "../utils/firebaseUtils";
import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";
import path from "path";
import { tmpdir } from "os";
import { rm } from "fs/promises";

/**
 * 執行單一影片的轉檔 + 上傳 + 更新 section.videoUrl
 */
export const handleVideoTranscodeTask = async ({ sectionId, tempFilePath }: { sectionId: string; tempFilePath: string }): Promise<void> => {
  const outputDir = path.join(tmpdir(), `${sectionId}_hls`);
  const sectionRepo = AppDataSource.getRepository(Section);

  try {
    // 1. 執行轉檔
    const transcodeError = await transcodeToMultiQuality(tempFilePath, outputDir);
    if (transcodeError) {
      // 轉檔失敗，更新 section.videoUrl 為錯誤訊息
      const section = await sectionRepo.findOne({ where: { id: sectionId } });
      if (section) {
        section.videoUrl = `error:${transcodeError}`;
        await sectionRepo.save(section);
        console.error(`❌ Section ${sectionId} 轉檔失敗：${transcodeError}`);
      }
      return;
    }

    // 2. 上傳到 Firebase
    try {
      const videoUrl = await uploadHLSFolderToFirebase(sectionId, outputDir);

      // 3. 更新資料庫
      const section = await sectionRepo.findOne({ where: { id: sectionId } });
      if (section) {
        section.videoUrl = videoUrl;
        await sectionRepo.save(section);
        console.log(`✅ Section ${sectionId} 已更新 videoUrl`);
      }
    } catch (uploadErr) {
      // 上傳失敗，更新 section.videoUrl 為錯誤訊息
      const section = await sectionRepo.findOne({ where: { id: sectionId } });
      if (section) {
        const uploadError = `上傳失敗：${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`;
        section.videoUrl = `error:${uploadError}`;
        await sectionRepo.save(section);
        console.error(`❌ Section ${sectionId} 上傳失敗：${uploadError}`);
      }
    }
  } catch (err) {
    // 處理其他未預期的錯誤
    const section = await sectionRepo.findOne({ where: { id: sectionId } });
    if (section) {
      const errorMessage = `處理失敗：${err instanceof Error ? err.message : String(err)}`;
      section.videoUrl = `error:${errorMessage}`;
      await sectionRepo.save(section);
      console.error(`❌ Section ${sectionId} 處理失敗：${errorMessage}`);
    }
  } finally {
    // 清理暫存檔案
    await rm(tempFilePath, { force: true }).catch(() => {});
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

/**
 * 執行單一影片的直接上傳任務
 */
export const handleVideoUploadTask = async ({
  sectionId,
  tempFilePath,
  originalFilename,
}: {
  sectionId: string;
  tempFilePath: string;
  originalFilename: string;
}): Promise<void> => {
  const sectionRepo = AppDataSource.getRepository(Section);

  try {
    // 直接上傳到 Firebase
    const videoUrl = await uploadVideoToFirebase(sectionId, tempFilePath, originalFilename);

    // 更新資料庫
    const section = await sectionRepo.findOne({ where: { id: sectionId } });
    if (section) {
      section.videoUrl = videoUrl;
      await sectionRepo.save(section);
      console.log(`✅ Section ${sectionId} 已更新 videoUrl`);
    }
  } catch (uploadErr) {
    // 上傳失敗，更新 section.videoUrl 為錯誤訊息
    const section = await sectionRepo.findOne({ where: { id: sectionId } });
    if (section) {
      const uploadError = `上傳失敗：${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`;
      section.videoUrl = `error:${uploadError}`;
      await sectionRepo.save(section);
      console.error(`❌ Section ${sectionId} 上傳失敗：${uploadError}`);
    }
  } finally {
    // 清理暫存檔案
    await rm(tempFilePath, { force: true }).catch(() => {});
  }
};
