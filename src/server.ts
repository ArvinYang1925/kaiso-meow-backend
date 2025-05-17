// server.ts
import app from "./app";
import { AppDataSource } from "./config/db";

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("📦 DB Connected!");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err);
  });
