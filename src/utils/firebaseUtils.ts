import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
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
 * 將 HLS 資料夾上傳至 Firebase Storage
 * @param sectionId 用來命名資料夾
 * @param localFolder 本機資料夾（含 m3u8 與 ts 檔案）
 * @returns 公開的 m3u8 URL
 */
export async function uploadHLSFolderToFirebase(sectionId: string, localFolder: string): Promise<string> {
  const firebaseStorage = bucket;
  const files = await fs.readdir(localFolder);

  const uploadPromises = files.map(async (fileName) => {
    const filePath = path.join(localFolder, fileName);
    const destination = `videos/${sectionId}/${fileName}`; // 儲存位置

    await bucket.upload(filePath, {
      destination,
      metadata: {
        contentType: getContentType(fileName),
        cacheControl: "public, max-age=3600",
      },
    });

    // 設為公開（選用，視需求）
    const uploadedFile = firebaseStorage.file(destination);
    await uploadedFile.makePublic();
  });

  await Promise.all(uploadPromises);

  // 傳回公開 m3u8 檔案 URL
  const m3u8Url = `https://storage.googleapis.com/${firebaseStorage.name}/videos/${sectionId}/playlist.m3u8`;
  return m3u8Url;
}

function getContentType(fileName: string): string {
  if (fileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (fileName.endsWith(".ts")) return "video/MP2T";
  return "application/octet-stream";
}
