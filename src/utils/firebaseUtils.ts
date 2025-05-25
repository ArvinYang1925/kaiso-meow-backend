import admin from "firebase-admin";
import dotenv from "dotenv";
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
