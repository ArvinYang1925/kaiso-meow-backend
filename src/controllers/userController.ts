import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema } from "../validator/userValidationSchemas";
import { AppDataSource } from "../config/db";
import { User } from "../entities/User";
import { Student } from "../entities/Student";
import { hashPassword, comparePassword } from "../utils/passwordUtils";
import { generateToken } from "../utils/jwtUtils";
import jwt from "jsonwebtoken";

const userRepo = AppDataSource.getRepository(User);
const studentRepo = AppDataSource.getRepository(Student);

/**
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 使用 Zod 驗證輸入
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { name, email, password } = parsed.data;

    // 2. 檢查是否已註冊
    const exists = await userRepo.findOneBy({ email });
    if (exists) {
      res.status(409).json({ status: "failed", message: "註冊失敗，Email 已被使用" });
      return;
    }

    // 3. 建 User
    const hashed = await hashPassword(password as string);
    const user = userRepo.create({
      name,
      email,
      password: hashed,
      role: "student",
      profileUrl: undefined,
    });
    const saved = await userRepo.save(user);

    // 4. 建 Student
    const student = studentRepo.create({
      userId: saved.id,
      phoneNumber: "",
    });
    await studentRepo.save(student);

    // 5. 產 token & 計算過期秒數
    const token = generateToken({ id: saved.id, role: saved.role });
    const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
    const expiresIn = exp - iat;

    // 6. 回傳
    res.status(201).json({
      status: "success",
      message: "註冊成功",
      data: {
        token,
        expiresIn,
        userInfo: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          phoneNumber: student.phoneNumber,
          role: saved.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 使用 Zod 驗證輸入
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json({ status: "failed", message: "帳號或密碼錯誤" });
      return;
    }
    const { email, password } = parsed.data;

    // 2. 找 user
    const user = await userRepo.findOneBy({ email });
    if (!user) {
      res.status(401).json({ status: "failed", message: "帳號或密碼錯誤" });
      return;
    }

    // 3. 比對密碼
    const match = await comparePassword(password, user.password);
    if (!match) {
      res.status(401).json({ status: "failed", message: "帳號或密碼錯誤" });
      return;
    }

    // 4. 產 token & 計算過期秒數
    const token = generateToken({ id: user.id, role: user.role });
    const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
    const expiresIn = exp - iat;

    // 5. 若為學生則取 phoneNumber
    let phoneNumber = "";
    if (user.role === "student") {
      const stu = await studentRepo.findOneBy({ userId: user.id });
      phoneNumber = stu?.phoneNumber ?? "";
    }

    // 6. 回傳
    res.status(200).json({
      status: "success",
      message: "登入成功",
      data: {
        token,
        expiresIn,
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // 由於 JWT 是無狀態的，服務端不需要實際操作
    // 實際的登出動作是在客戶端刪除 token

    res.status(200).json({
      status: "success",
      message: "登出成功",
    });
  } catch (err) {
    next(err);
  }
}
