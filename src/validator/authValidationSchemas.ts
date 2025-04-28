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
