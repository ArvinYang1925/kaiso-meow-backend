import { z } from "zod";

// 建立 UUID 驗證 schema
export const uuidSchema = z.string().uuid({
  message: "無效的 UUID 格式",
});
