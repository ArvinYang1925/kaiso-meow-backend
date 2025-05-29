import { Job } from "bull";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { writeFile, rm } from "fs/promises";
import path from "path";
import fs from "fs";
import { AppDataSource } from "../../config/db";
import { Section } from "../../entities/Section";
import { uploadHLSFolderToFirebase } from "../../utils/firebaseUtils"; // Firebase 上傳工具

export async function processVideoTranscode(job: Job) {
  const { sectionId, originalName, buffer } = job.data;
  const tempInputPath = path.join(tmpdir(), `${sectionId}_${Date.now()}_${originalName}`);
  const tempOutputDir = path.join(tmpdir(), `${sectionId}_hls`);

  try {
    await writeFile(tempInputPath, buffer);
    fs.mkdirSync(tempOutputDir, { recursive: true });

    // 轉為 HLS
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .outputOptions([
          "-preset veryfast",
          "-g 48",
          "-sc_threshold 0",
          "-map 0:0",
          "-s:v:0 1280x720",
          "-c:v:0 libx264",
          "-b:v:0 1400k",
          "-map 0:1",
          "-c:a:0 aac",
          "-b:a:0 128k",
          "-f hls",
          "-hls_time 10",
          "-hls_list_size 0",
          "-hls_segment_filename",
          path.join(tempOutputDir, "seg_%03d.ts"),
        ])
        .output(path.join(tempOutputDir, "playlist.m3u8"))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // 上傳 HLS 資料夾到 Firebase Storage（傳回公開 URL）
    const videoUrl = await uploadHLSFolderToFirebase(sectionId, tempOutputDir);

    // 更新 Section 資料表
    const sectionRepo = AppDataSource.getRepository(Section);
    await sectionRepo.update(sectionId, {
      videoUrl,
    });

    // 清理檔案
    await rm(tempInputPath);
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
  } catch (err) {
    console.error("轉檔失敗：", err);
    throw err;
  }
}
