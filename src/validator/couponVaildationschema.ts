import { z } from "zod";

export const createCouponSchema = z
  .object({
    couponName: z.string().min(1).max(50),
    type: z.enum(["amount", "percentage"]),
    code: z.string().min(1),
    value: z.number().positive(),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .refine((data) => data.startsAt <= data.expiresAt, {
    message: "開始時間不能晚於結束時間",
    path: ["startsAt"],
  });
