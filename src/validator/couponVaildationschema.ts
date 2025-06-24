import { z } from "zod";

export const createCouponSchema = z
  .object({
    couponName: z
      .string({ message: "請填寫折扣碼名稱" })
      .min(1, { message: "折扣碼名稱不得為空" })
      .max(50, { message: "折扣碼名稱不得超過 50 字" }),

    type: z.enum(["fixed", "percentage"], {
      message: "折扣類型必須是 fixed 或 percentage",
    }),

    code: z.string({ message: "請填寫折扣碼代碼" }).min(1, { message: "折扣碼代碼不得為空" }),

    value: z.number({ message: "請填寫折扣數值" }).positive({ message: "折扣數值必須為正數" }),

    startsAt: z.coerce.date({ message: "請填寫折扣開始時間" }).refine((date) => !isNaN(date.getTime()), {
      message: "開始時間格式不正確",
    }),

    expiresAt: z.coerce.date({ message: "請填寫折扣結束時間" }).refine((date) => !isNaN(date.getTime()), {
      message: "結束時間格式不正確",
    }),
  })
  .refine((data) => data.startsAt <= data.expiresAt, {
    path: ["startsAt"],
    message: "開始時間不能晚於結束時間",
  })
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

export const aiCouponPlanInputSchema = z.object({
  courseDescription: z.string().min(10),
  launchDate: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "launchDate 格式錯誤，應為 YYYY-MM-DD",
  }),
  numberOfPhases: z.number().int().min(1).max(5),
  discountType: z.enum(["fixed", "percent"]),
  keywordThemes: z.string().optional(),
  phaseDurationDays: z.number().min(1).optional(),
});

const couponItemSchema = z.object({
  couponName: z.string().min(1),
  type: z.enum(["fixed", "percent"]),
  code: z.string().min(1),
  value: z.number().nonnegative(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startsAt 格式錯誤"),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expiresAt 格式錯誤"),
});

export const aiCouponPlanResponseSchema = z.object({
  strategySummary: z.string().min(1),
  coupons: z.array(couponItemSchema).min(1),
});

export const createBatchCouponsSchema = z.object({
  coupons: z.array(couponItemSchema).min(1, "請至少輸入一筆折扣碼"),
});
