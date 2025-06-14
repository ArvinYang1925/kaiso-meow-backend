import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { lookup } from "mime-types"; // ✅ TS 友善 API
import type { UploadResponse } from "@google-cloud/storage";

dotenv.config();

// 將 .env 裡的 JSON 字串 parse 出來
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

// 初始化 Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// 拿到預設 Bucket
const bucket = admin.storage().bucket();

export { admin, bucket };

/**
 * 批次上傳 HLS 資料夾，回傳 master.m3u8 的公開 CDN URL
 */
export const uploadHLSFolderToFirebase = async (sectionId: string, folderPath: string): Promise<string> => {
  const files = await fs.readdir(folderPath);
  const uploadPromises: Promise<UploadResponse>[] = [];

  for (const fileName of files) {
    const fullPath = path.join(folderPath, fileName);
    const mimeType = lookup(fullPath) || "application/octet-stream";

    const firebasePath = `sections/${sectionId}/hls/${fileName}`;

    const uploadPromise = bucket.upload(fullPath, {
      destination: firebasePath,
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
      },
      public: true, // ✅ 讓檔案可被公開存取
    });

    uploadPromises.push(uploadPromise);
  }

  await Promise.all(uploadPromises);

  // ✅ 尋找 master.m3u8 並組成 URL
  const masterName = "master.m3u8";
  const masterFile = files.find((f) => f === masterName);

  if (!masterFile) {
    throw new Error("master.m3u8 不存在於輸出資料夾中");
  }

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/sections/${sectionId}/hls/${masterFile}`;
  return publicUrl;
};

/**
 * 直接上傳影片到 Firebase，回傳影片的公開 CDN URL
 */
export const uploadVideoToFirebase = async (sectionId: string, filePath: string, originalFilename: string): Promise<string> => {
  const ext = path.extname(originalFilename).toLowerCase();
  const firebasePath = `sections/${sectionId}/video${ext}`;
  const mimeType = lookup(filePath) || "video/mp4";

  await bucket.upload(filePath, {
    destination: firebasePath,
    metadata: {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000",
    },
    public: true, // ✅ 讓檔案可被公開存取
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;
  return publicUrl;
};

/**
 * 刪除指定 section 的 HLS 影片資料夾
 * @param sectionId 章節 ID
 */
export async function deleteHLSFolderFromFirebase(sectionId: string) {
  const folderPath = `sections/${sectionId}/hls/`;
  const [files] = await bucket.getFiles({ prefix: folderPath });

  if (files.length === 0) {
    throw new Error("該資料夾中找不到任何影片檔案");
  }

  const deletePromises = files.map((file) => file.delete());
  await Promise.all(deletePromises);
}
