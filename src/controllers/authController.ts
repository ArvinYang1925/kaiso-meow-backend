import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, editStudentProfileSchema } from "../validator/authValidationSchemas";
import { AppDataSource } from "../config/db";
import { User } from "../entities/User";
import { Student } from "../entities/Student";
import { NewsletterSubscriber } from "../entities/NewsletterSubscriber";
import { hashPassword, comparePassword } from "../utils/passwordUtils";
import { generateToken } from "../utils/jwtUtils";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/isAuth";

const userRepo = AppDataSource.getRepository(User);
const studentRepo = AppDataSource.getRepository(Student);
const newsletterRepo = AppDataSource.getRepository(NewsletterSubscriber);

/**
 * API #4 POST /api/v1/auth/register
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-auth-register-1d06a246851880d9b3f9ce38e84c68cd?source=copy_link)
 *
 * 此 API 用於註冊新用戶
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

    // 5. 檢查並更新電子報訂閱者資料
    const newsletterSubscriber = await newsletterRepo.findOneBy({ email });
    if (newsletterSubscriber) {
      await newsletterRepo.update(
        { email },
        {
          userId: saved.id,
          name: name, // 更新訂閱者名稱
        },
      );
    }
    // 6. 產 token & 計算過期秒數
    const token = generateToken({ id: saved.id, role: saved.role });
    const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
    const expiresIn = exp - iat;

    // 7. 回傳
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
 * API #5 POST /api/v1/auth/login
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-auth-login-1d06a246851880d19ed6d8d5b4e244d8?source=copy_link)
 *
 * 此 API 用於用戶登入
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
 * API #8 POST /api/v1/auth/logout
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-auth-logout-1d46a2468518800b8a11e5a9cec12959?source=copy_link)
 *
 * 此 API 用於用戶登出
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

/**
 * API #1 GET /api/v1/auth/profile
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-auth-profile-1d06a24685188099a0b6f692a01666b9?source=copy_link)
 *
 * 此 API 用於獲取學生個人資料
 */
export async function getStudentProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id; // 查詢學生資料，包含 user 關聯
    const student = await studentRepo
      .createQueryBuilder("student")
      .leftJoinAndSelect("student.user", "user")
      .where("student.userId = :userId", { userId })
      .getOne();

    if (!student) {
      res.status(404).json({ status: "failed", message: "找不到學生資料" });
      return;
    }

    res.status(200).json({
      status: "success",
      data: {
        id: student.user.id,
        name: student.user.name,
        email: student.user.email,
        phoneNumber: student.phoneNumber,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #2 PUT /api/v1/auth/student/profile
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PUT-api-v1-auth-profile-1d06a2468518805eb8aadbddc386116c?source=copy_link)
 *
 * 此 API 用於修改學生個人資料
 */
export async function editStudentProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 1. 驗證輸入
    const parsed = editStudentProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { name, phoneNumber } = parsed.data;

    // 2. 取得使用者 ID
    const userId = req.user?.id;
    // 3. 取得現有資料
    const student = await studentRepo
      .createQueryBuilder("student")
      .leftJoinAndSelect("student.user", "user")
      .where("student.userId = :userId", { userId })
      .getOne();

    // 4. 檢查是否需要更新
    const needUpdateUser = name !== student?.user.name;
    const needUpdateStudent = phoneNumber !== undefined && phoneNumber !== student?.phoneNumber;

    if (!needUpdateUser && !needUpdateStudent) {
      res.status(200).json({
        status: "success",
        message: "資料未變更",
        data: {
          id: student.user.id,
          name: student.user.name,
          email: student.user.email,
          phoneNumber: student.phoneNumber,
        },
      });
      return;
    }
    // 5. 更新 User 資料（如果需要）
    if (needUpdateUser) {
      const userResult = await userRepo.update({ id: userId }, { name });
      if (userResult.affected === 0) {
        res.status(404).json({ status: "failed", message: "更新使用者資料失敗" });
        return;
      }
    }

    // 6. 更新 Student 資料（如果需要）
    if (needUpdateStudent) {
      const studentResult = await studentRepo.update({ userId }, { phoneNumber });
      if (studentResult.affected === 0) {
        res.status(404).json({ status: "failed", message: "更新學生資料失敗" });
        return;
      }
    }

    // 7. 回傳更新後的資料
    const updatedStudent = await studentRepo
      .createQueryBuilder("student")
      .leftJoinAndSelect("student.user", "user")
      .where("student.userId = :userId", { userId })
      .getOne();

    if (!updatedStudent) {
      res.status(404).json({ status: "failed", message: "找不到學生資料" });
      return;
    }
    res.status(200).json({
      status: "success",
      data: {
        id: updatedStudent.user.id,
        name: updatedStudent.user.name,
        email: updatedStudent.user.email,
        phoneNumber: updatedStudent.phoneNumber,
      },
    });
  } catch (err) {
    next(err);
  }
}
