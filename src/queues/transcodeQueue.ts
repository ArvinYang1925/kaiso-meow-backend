import Bull from "bull";
import { processVideoTranscode } from "./processors/transcodeProcessor";
export interface TranscodeJobData {
  sectionId: string;
  originalName: string;
  tempFilePath: string;
}

export const transcodeQueue = new Bull<TranscodeJobData>("transcode-video", {
  redis: { host: "localhost", port: 6379 }, // 可改為你的設定
});

transcodeQueue.process("transcode-video", processVideoTranscode);

console.log("✅ transcodeQueue processor 已綁定");

transcodeQueue.on("error", (err) => {
  console.error("❌ Redis Queue 連接錯誤：", err.message);
});

transcodeQueue.on("active", (job) => {
  console.log("🏃 開始執行任務：", job.id);
});

transcodeQueue.on("completed", (job) => {
  console.log("✅ 任務完成：", job.id);
});

transcodeQueue.on("failed", (job, err) => {
  console.error("❌ 任務失敗：", job.id, err.message);
});
