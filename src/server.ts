// server.ts
import app from "./app";
import { AppDataSource } from "./config/db";
import { notifyDiscord } from "./utils/notifyDiscord";

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("📦 DB Connected!");
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      await notifyDiscord(); // ⬅️ 應用啟動成功後才送出通知
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err);
  });
