import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import todoRoutes from "./routes/todoRoutes";
import authRoutes from "./routes/authRoutes";
import instructorRoutes from "./routes/instructorRoutes";
import newsletterRoutes from "./routes/newsletterRoutes";
import courseRoutes from "./routes/courseRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();

// 允許 cors 白名單設定
const whitelist = ["https://kaiso-meow-frontend.onrender.com", "http://localhost:5173", "https://kaiso-meow-backend-test0514.onrender.com"];
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

// 路由掛載
app.use("/api/todos", todoRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/instructor", instructorRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/orders", orderRoutes);

// 測試根目錄
app.get("/", (req, res) => {
  res.send("Hello, Kaiso Backend!");
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "failed",
    message: "無此路由",
  });
});

// 500 handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    status: "error",
    message: "伺服器發生錯誤",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ✅ 匯出 app 給 Jest 測試用
export default app;
