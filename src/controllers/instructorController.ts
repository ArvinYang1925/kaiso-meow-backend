import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Instructor } from "../entities/Instructor";
import { AuthRequest } from "../middleware/isAuth";
import { User } from "../entities/User";
import { updateInstructorProfileSchema } from "../validator/authValidationSchemas";

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
