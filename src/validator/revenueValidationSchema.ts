import { z } from "zod";
// 收益報表參數驗證 schema
export const revenueReportSchema = z
  .object({
    startTime: z
      .string({ message: "開始時間為必填" })
      .refine((val) => !isNaN(Date.parse(val)), { message: "開始時間格式不正確" })
      .transform((val) => new Date(val)),

    endTime: z
      .string({ message: "結束時間為必填" })
      .refine((val) => !isNaN(Date.parse(val)), { message: "結束時間格式不正確" })
      .transform((val) => new Date(val)),

    interval: z.enum(["day", "week", "month"], {
      message: "時間間隔必須是 day、week 或 month",
    }),

    courseId: z.string().uuid({ message: "課程 ID 格式不正確" }).optional(),
  })
  .refine((data) => data.startTime <= data.endTime, {
    path: ["startTime"],
    message: "開始時間不能晚於結束時間",
  });
