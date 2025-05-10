// src/validator/authValidationSchemas.ts
import { z } from "zod";

// 姓名規則
export const nameSchema = z.string().min(1, { message: "姓名為必填" }).max(49, { message: "姓名長度需少於 50 個字元" });

// Email 規則
export const emailSchema = z.string().min(1, { message: "Email 為必填" }).email({ message: "Email 不符合格式" });

// 密碼規則
export const passwordSchema = z
  .string()
  .min(8, { message: "密碼長度至少 8 個字元" })
  .max(12, { message: "密碼長度最多 12 個字元" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,12}$/, {
    message: "請輸入 8–12 字元密碼，並包含大小寫字母及數字",
  });

// 電話號碼規則
export const phoneNumberSchema = z
  .union([
    z.string().regex(/^[0-9]{10}$/, { message: "電話號碼需為 10 位數字" }),
    z.literal(""), // 把空字串當作合法輸入
    z.undefined(),
  ])
  .optional();

// 圖片網址規則
export const avatarSchema = z.string().url("請提供有效的圖片 URL").optional();

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// 編輯學生資料檢查
export const editStudentProfileSchema = z.object({
  name: nameSchema,
  phoneNumber: phoneNumberSchema,
});

// 更新講師資料檢查
export const updateInstructorProfileSchema = z.object({
  name: nameSchema,
  avatar: avatarSchema,
});

// 訂閱電子報檢查
export const subscribeSchema = z.object({
  email: emailSchema,
  name: nameSchema,
});
