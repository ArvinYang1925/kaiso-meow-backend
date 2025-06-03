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
 * 注意：解析度順序會影響 master.m3u8 中的順序
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
 * 將 bitrate 字串轉換為數字（單位：bps）
 * @example "1400k" -> 1400000
 */
const parseBitrate = (bitrate: string): number => {
  const value = parseInt(bitrate.replace("k", ""));
  return value * 1000;
};

/**
 * 生成 master.m3u8 內容
 */
const generateMasterM3U8 = (): string => {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];

  resolutions.forEach(({ label, width, height, bitrate }) => {
    const bandwidth = parseBitrate(bitrate);
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}`);
    lines.push(`playlist_${label}.m3u8`);
  });

  return lines.join("\n") + "\n";
};

/**
 * 執行多解析度 HLS 影片轉檔
 *
 * @param inputPath 原始影片路徑
 * @param outputDir 輸出資料夾
 * @returns 成功時回傳 undefined，失敗時回傳錯誤訊息
 */
export const transcodeToMultiQuality = async (inputPath: string, outputDir: string): Promise<string | undefined> => {
  try {
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

    // 使用自動生成的 master.m3u8 內容
    const masterM3U8 = generateMasterM3U8();
    await fs.writeFile(path.join(outputDir, "master.m3u8"), masterM3U8);
    
    return undefined; // 成功時回傳 undefined
  } catch (err) {
    const errorMessage = `轉檔失敗：${err instanceof Error ? err.message : String(err)}`;
    console.error("❌ 影片轉檔失敗：", errorMessage);
    return errorMessage; // 失敗時回傳錯誤訊息
  }
};
