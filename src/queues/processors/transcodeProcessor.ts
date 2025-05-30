import { Job } from "bull";
import path from "path";
import { tmpdir } from "os";
import { rm } from "fs/promises";
import { AppDataSource } from "../../config/db";
import { Section } from "../../entities/Section";
import { transcodeToMultiQuality } from "./ffmpegHelpers";
import { uploadHLSFolderToFirebase } from "../../utils/firebaseUtils";
import { TranscodeJobData } from "../transcodeQueue";

/**
 * Bull 任務處理器：轉檔 + 上傳 + 更新 section.videoUrl
 */
export const processVideoTranscode = async (job: Job<TranscodeJobData>) => {
  const { sectionId, tempFilePath } = job.data;

  const outputDir = path.join(tmpdir(), `${sectionId}_hls`);
  const sectionRepo = AppDataSource.getRepository(Section);

  try {
    // ✅ 執行多畫質轉檔
    await transcodeToMultiQuality(tempFilePath, outputDir);

    // ✅ 上傳整個資料夾（含 master.m3u8 + TS 檔）
    const videoUrl = await uploadHLSFolderToFirebase(sectionId, outputDir);

    // ✅ 更新資料庫 section.videoUrl
    const section = await sectionRepo.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new Error("找不到對應章節");
    }

    section.videoUrl = videoUrl;
    await sectionRepo.save(section);

    job.log(`影片轉檔與上傳完成，videoUrl: ${videoUrl}`);
  } catch (err) {
    console.error("❌ 任務失敗：", err);
    throw err;
  } finally {
    // 🧹 清理暫存檔案與資料夾
    await rm(tempFilePath, { force: true }).catch(() => {});
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};
