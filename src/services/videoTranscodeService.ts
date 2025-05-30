// src/services/videoTranscodeService.ts
import { transcodeToMultiQuality } from "../queues/processors/ffmpegHelpers";
import { uploadHLSFolderToFirebase } from "../utils/firebaseUtils";
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
    await transcodeToMultiQuality(tempFilePath, outputDir);
    const videoUrl = await uploadHLSFolderToFirebase(sectionId, outputDir);

    const section = await sectionRepo.findOne({ where: { id: sectionId } });
    if (section) {
      section.videoUrl = videoUrl;
      await sectionRepo.save(section);
      console.log(`✅ Section ${sectionId} 已更新 videoUrl`);
    }
  } catch (err) {
    console.error("❌ 影片轉檔或上傳失敗：", err);
  } finally {
    await rm(tempFilePath, { force: true }).catch(() => {});
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};
