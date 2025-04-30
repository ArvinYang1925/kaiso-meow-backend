// src/validator/authValidationSchemas.ts
import { z } from "zod";

// 密碼規則
export const passwordSchema = z
  .string()
  .min(8, { message: "密碼為必填" })
  .max(12, { message: "密碼長度需少於 12" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,12}$/, {
    message: "密碼不符合規則",
  });

// Email 規則
export const emailSchema = z.string().min(1, { message: "Email 為必填" }).email({ message: "email 不符合格式" });

// 名稱規則
export const nameSchema = z.string().min(1, { message: "姓名為必填" }).max(49, { message: "姓名長度需少於 50" });

// 電話號碼規則
export const phoneNumberSchema = z
  .union([
    z.string().regex(/^[0-9]{10}$/, { message: "電話號碼需為 10 位數字" }),
    z.literal(""), // 把空字串當作合法輸入
    z.undefined(),
  ])
  .optional();

// Register / Login schema
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const editStudentProfileSchema = z.object({
  name: nameSchema,
  phoneNumber: phoneNumberSchema,
});
