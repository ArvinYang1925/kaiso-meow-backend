import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import { AppDataSource } from "./config/db";
import todoRoutes from "./routes/todoRoutes";
import authRoutes from "./routes/authRoutes";
import instructorRoutes from "./routes/instructorRoutes";
import newsletterRoutes from "./routes/newsletterRoutes";
import courseRoutes from "./routes/courseRoutes";
import orderRoutes from "./routes/orderRoutes";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();

// 允許 cors 白名單設定
const whitelist = ["https://kaiso-meow-frontend.onrender.com", "http://localhost:5173", "http://localhost:3000"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use("/api/todos", todoRoutes); // 加上 Todo 路由
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/instructor", instructorRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/orders", orderRoutes);

// 加入靜態檔案服務
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.send("Hello, Kaiso Backend!");
});

// 設定 404 處理中間件
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "failed",
    message: "無此路由",
  });
});

// 設定500 錯誤處理中間件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    status: "error",
    message: "伺服器發生錯誤",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

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
