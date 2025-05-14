import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Instructor } from "../entities/Instructor";
import { AuthRequest } from "../middleware/isAuth";
import { User } from "../entities/User";
import { updateInstructorProfileSchema } from "../validator/authValidationSchemas";
import { paginationSchema } from "../validator/commonValidationSchemas";
import { getInstructorIdByUserId } from "../utils/instructorUtils";

/**
 * API #26 GET /api/v1/instructor/me
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const instructorRepo = AppDataSource.getRepository(Instructor);
    const instructor = await instructorRepo.findOne({
      where: { userId: req.user?.id },
      relations: ["user"],
    });

    if (!instructor) {
      res.status(404).json({
        status: "failed",
        message: "找不到講師資料",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "取得講師資料成功",
      data: {
        id: instructor!.id,
        name: instructor!.user.name,
        email: instructor!.user.email,
        profileUrl: instructor!.user.profileUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #27 PUT /api/v1/instructor/me
 */
export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = updateInstructorProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    const { name, avatar } = parsed.data;
    const instructorRepo = AppDataSource.getRepository(Instructor);
    const instructor = await instructorRepo.findOne({
      where: { userId: req.user?.id },
      relations: ["user"],
    });

    if (!instructor) {
      res.status(404).json({
        status: "failed",
        message: "找不到講師資料",
      });
      return;
    }

    instructor.user.name = name;
    instructor.user.profileUrl = avatar;
    await AppDataSource.getRepository(User).save(instructor.user);

    res.status(200).json({
      status: "success",
      message: "個人資料更新成功",
      data: {
        name: instructor.user.name,
        email: instructor.user.email,
        avatar: instructor.user.profileUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API #45 GET -/api/v1/instructor/students?page=1&pageSize=10
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-instructor-students-page-1-pageSize-10-1d06a2468518802d84d2d41e76ecd1f0?pvs=4)
 *
 * 此 API 讓講師可在後台查看學生資料，包括：姓名、email、電話號碼
 */
export async function getStudentsByInstructor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const result = paginationSchema.safeParse(req.query);
    if (!result.success) {
      const err = result.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }

    const { page, pageSize } = result.data;

    const instructorId = await getInstructorIdByUserId(userId);
    if (!instructorId) {
      res.status(403).json({
        status: "failed",
        message: "查無講師資料",
      });
      return;
    }

    // 查詢學生清單
    const [students, total] = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .innerJoin("user.orders", "order")
      .innerJoin("order.course", "course")
      .where("course.instructorId = :instructorId", { instructorId: instructorId })
      .andWhere("user.role = :role", { role: "student" })
      .andWhere("order.paidAt IS NOT NULL")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy("user.createdAt", "DESC")
      .getManyAndCount();

    const formatted = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phoneNumber: s.profileUrl || "",
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    res.status(200).json({
      status: "success",
      data: {
        studentList: formatted,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
