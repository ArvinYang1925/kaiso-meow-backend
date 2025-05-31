import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

/**
 * 單一解析度設定
 */
interface ResolutionSetting {
  label: string; // 標籤名稱，例如 "720p"
  width: number; // 寬度
  height: number; // 高度
  bitrate: string; // video bitrate，例如 "1400k"
}

/**
 * 支援的解析度清單
 */
const resolutions: ResolutionSetting[] = [
  {
    label: "720p",
    width: 1280,
    height: 720,
    bitrate: "1400k",
  },
  {
    label: "480p",
    width: 854,
    height: 480,
    bitrate: "800k",
  },
];

/**
 * 執行多解析度 HLS 影片轉檔
 *
 * @param inputPath 原始影片路徑
 * @param outputDir 輸出資料夾
 */
export const transcodeToMultiQuality = async (inputPath: string, outputDir: string): Promise<void> => {
  await fs.mkdir(outputDir, { recursive: true });

  const transcodeJobs = resolutions.map(({ label, width, height, bitrate }) => {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset veryfast",
          "-g 48",
          "-sc_threshold 0",
          `-s ${width}x${height}`,
          `-b:v ${bitrate}`,
          "-map 0:0", // 指定 video stream
          "-map 0:a?", // 有音訊就用，沒音訊不報錯
          "-b:a 128k",
          "-hls_time 10",
          "-hls_list_size 0",
          `-hls_segment_filename ${path.join(outputDir, `${label}_seg_%03d.ts`)}`,
        ])
        .output(path.join(outputDir, `playlist_${label}.m3u8`))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  });

  await Promise.all(transcodeJobs);

  // ➕ 建立 master.m3u8，讓播放器自動選擇畫質
  const masterM3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
playlist_720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480
playlist_480p.m3u8
`;
  await fs.writeFile(path.join(outputDir, "master.m3u8"), masterM3U8);
};
