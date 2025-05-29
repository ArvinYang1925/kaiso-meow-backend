import Bull from "bull";
import { processVideoTranscode } from "./processors/transcodeProcessor";

interface TranscodeJobData {
  sectionId: string;
  originalName: string;
  buffer: Buffer;
}

export const transcodeQueue = new Bull<TranscodeJobData>("transcode-video", {
  redis: { host: "localhost", port: 6379 }, // 可改為你的設定
});

transcodeQueue.process(processVideoTranscode);
