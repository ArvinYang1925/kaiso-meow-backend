// validator/sectionValidationSchemas.ts
import { z } from "zod";

export const sectionSchema = z.object({
  title: z
    .string({ required_error: "title 是必填欄位", invalid_type_error: "title 必須是文字" })
    .min(1, "章節標題為必填")
    .max(100, "章節標題不得超過 100 字"),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
});

export const publishSectionSchema = z.object({
  isPublished: z.boolean(),
});
