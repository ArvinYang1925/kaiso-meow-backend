// validator/sectionValidationSchemas.ts
import { z } from "zod";

export const sectionSchema = z.object({
  title: z
    .string({ required_error: "title 是必填欄位", invalid_type_error: "title 必須是文字" })
    .min(1, "章節標題為必填")
    .max(100, "章節標題不得超過 100 字"),
  content: z.string().optional(),
});

export const updateSectionSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    content: z.string().optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "請至少提供 title 或 content",
  });

export const publishSectionSchema = z.object({
  isPublished: z.boolean(),
});

export const aiSectionSchema = z.object({
  description: z.string().min(1, "課程描述必填"),
  expectedSectionCount: z.number().int("章節數量需為整數").gt(0, "章節數量需為正整數").optional(),
  sectionIdea: z.string().optional(),
});

export const batchSectionSchema = z.object({
  sections: z.array(sectionSchema).min(1, "至少需要一個章節"),
});

export const sectionInputSchema = z.object({
  id: z.string().min(1, { message: "id 不可為空" }),
  order: z.number().int().min(1, { message: "order 必須為大於 0 的整數" }),
});

export const sortSectionsSchema = z.object({
  sections: z.array(sectionInputSchema).nonempty({ message: "sections 不可為空" }),
});
