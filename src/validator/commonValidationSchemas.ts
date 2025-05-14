import { z } from "zod";

// 建立 UUID 驗證 schema
export const uuidSchema = z.string().uuid({
  message: "無效的 UUID 格式",
});

// 分頁參數驗證 schema
export const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int("頁碼必須為整數").positive("頁碼必須為正數").default(1)),
  pageSize: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int("每頁顯示數量必須為整數").min(1, "每頁顯示數量必須為正數").max(50, "每頁顯示數量不能超過 50").default(10)),
});
