import { z } from "zod";

const couponItemSchema = z
  .object({
    couponName: z
      .string({ message: "請填寫折扣碼名稱" })
      .min(1, { message: "折扣碼名稱不得為空" })
      .max(50, { message: "折扣碼名稱不得為超過 50 字" }),
    type: z.enum(["fixed", "percentage"], { message: "折扣類型必須是 fixed 或 percentage" }),
    code: z.string({ message: "請填寫折扣碼代碼" }).min(1, { message: "折扣碼代碼不得為空" }),
    value: z.number({ message: "請填寫折扣數值" }).positive({ message: "折扣數值必須為正數" }),
    startsAt: z
      .string({ message: "請填寫開始時間" })
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: "開始時間格式錯誤，應為 YYYY-MM-DD" }),
    expiresAt: z
      .string({ message: "請填寫結束時間" })
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: "結束時間格式錯誤，應為 YYYY-MM-DD" }),
  })
  .refine((data) => new Date(data.startsAt) <= new Date(data.expiresAt), { message: "開始時間必須早於或等於結束時間", path: ["startsAt"] })
  .superRefine((data, ctx) => {
    if (data.type === "percentage") {
      if (data.value < 1 || data.value > 99) {
        ctx.addIssue({
          path: ["value"],
          code: z.ZodIssueCode.custom,
          message: "percentage 類型的折扣值必須介於 1% 到 99% 之間",
        });
      }
    }
  });

export const createCouponSchema = couponItemSchema;

export const aiCouponPlanInputSchema = z.object({
  courseDescription: z.string({ message: "請填寫課程描述" }).min(8, { message: "課程描述至少 8 字元" }),
  launchDate: z.string({ message: "請填寫開課日期" }).refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "開課日期格式錯誤，應為 YYYY-MM-DD",
  }),
  numberOfPhases: z
    .number({ message: "請填寫促銷階段數" })
    .int({ message: "促銷階段數必須為整數" })
    .min(1, { message: "促銷階段數至少 1" })
    .max(6, { message: "促銷階段數最多 6" }),
  discountType: z.enum(["fixed", "percentage"], { message: "折扣類型必須是 fixed 或 percentage" }),
  keywordThemes: z.string({ message: "請填寫主題關鍵字" }).optional(),
  phaseDurationDays: z.number({ message: "請填寫每階段天數" }).min(1, { message: "每階段天數至少 1 天" }).optional(),
});

export const aiCouponPlanResponseSchema = z.object({
  strategySummary: z.string().min(1),
  coupons: z.array(couponItemSchema).min(1, "請至少輸入一筆折扣碼"),
});

export const createBatchCouponsSchema = z.object({
  coupons: z.array(couponItemSchema).min(1, "請至少輸入一筆折扣碼"),
});
