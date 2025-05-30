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
        "-preset veryfast",
        "-g 48",
        "-sc_threshold 0",
        "-map 0:0",
        "-s:v:0 1280x720",
        "-c:v:0 libx264",
        "-b:v:0 1400k",
        "-map 0:a?",
        "-c:a:0 aac",
        "-b:a:0 128k",
        "-f hls",
        "-hls_time 10",
        "-hls_list_size 0",
        "-hls_segment_filename",
        path.join(outputDir, "seg_%03d.ts"),
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
