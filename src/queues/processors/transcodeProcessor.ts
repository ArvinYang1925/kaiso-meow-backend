import { Job } from "bull";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { rm } from "fs/promises";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../../config/db";
import { Section } from "../../entities/Section";
import { uploadHLSFolderToFirebase } from "../../utils/firebaseUtils";

export async function processVideoTranscode(job: Job) {
  const { sectionId, tempFilePath } = job.data;

  const outputDir = path.join(tmpdir(), `${sectionId}_hls`);
  fs.mkdirSync(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(tempFilePath)
      .outputOptions([
        // 設定轉檔速度與壓縮效率（愈快品質愈低）
        "-preset veryfast", // 轉檔速度 preset（選項從 ultrafast → placebo，veryfast 是效能/品質折衷）

        // 影格間隔（GOP: Group Of Pictures）
        "-g 48", // 每 48 個影格插入一個 keyframe（關鍵影格，HLS 要用來切段）

        // 場景切換偵測敏感度（避免因場景改變插入不必要的 keyframe）
        "-sc_threshold 0", // 關閉場景變化偵測（確保固定 GOP 間隔）

        // 指定視訊輸入來源（0:0 代表第一個輸入的 video stream）
        "-map 0:0", // 指定輸入來源的第 0 個 stream（video）

        // 視訊輸出解析度
        "-s:v:0 1280x720", // 視訊尺寸為 1280x720（HD）

        // 視訊編碼器
        "-c:v:0 libx264", // 使用 H.264 編碼器（libx264）

        // 視訊 bitrate（流量大小，影響畫質與檔案大小）
        "-b:v:0 1400k", // 設定視訊 bitrate 為 1400kbps（適中畫質）

        // 指定音訊輸入來源（若有）
        "-map 0:a?", // 指定第 0 個輸入的 audio stream（加 ? 是為了忽略無 audio 的情況）

        // 音訊編碼器
        "-c:a:0 aac", // 使用 AAC 編碼器（廣泛支援）

        // 音訊 bitrate
        "-b:a:0 128k", // 設定音訊 bitrate 為 128kbps
      ])
      .output(path.join(outputDir, "playlist.m3u8"))
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  const videoUrl = await uploadHLSFolderToFirebase(sectionId, outputDir);

  const sectionRepo = AppDataSource.getRepository(Section);
  await sectionRepo.update(sectionId, { videoUrl });

  await rm(tempFilePath); // ✅ 清除暫存影片檔
  fs.rmSync(outputDir, { recursive: true, force: true });
}
