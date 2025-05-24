import { z } from "zod";

export const titleSchema = z.string().min(1, { message: "課程名為必填" }).max(30, { message: "課程名長度需少於 30 個字元" });
export const subtitleSchema = z.string().max(50, { message: "課程名長度需少於 50 個字元" }).optional();
export const descriptionSchema = z.string().min(1, { message: "敘述為必填" });
export const durationSchema = z.number().positive({ message: "長度數值要大於0" });
export const highlightSchema = z.string({ message: "highlight必須要是字串" }).optional();
export const priceSchema = z.number().int().nonnegative({ message: "數值不能為負數" });
export const isFreeSchema = z.boolean({ message: "isFree必須為布林" });
export const coverUrlSchema = z.string().url({ message: "coverUrl必須是合法的url" }).max(2048).optional();

export const createCourseSchema = z.object({
  title: titleSchema,
  subtitle: subtitleSchema,
  description: descriptionSchema,
  highlight: highlightSchema,
  duration: durationSchema,
  price: priceSchema,
  isFree: isFreeSchema,
  coverUrl: coverUrlSchema,
});

export const updateCourseSchema = z.object({
  title: titleSchema,
  subtitle: subtitleSchema,
  description: descriptionSchema,
  highlight: highlightSchema,
  duration: durationSchema,
  price: priceSchema,
  isFree: isFreeSchema,
  coverUrl: coverUrlSchema,
});

export const publishCourseSchema = z.object({
  isPublished: z.boolean({
    message: "isPublished 必須為布林值",
  }),
});
