import "reflect-metadata";
import express, { Request, Response } from "express";
import { AppDataSource } from "./config/db";
import todoRoutes from "./routes/todoRoutes";
import authRoutes from "./routes/authRoutes";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 允許 cors 白名單設定
const whitelist = ["https://kaiso-meow-frontend.onrender.com", "http://localhost:5173"];
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
