import { AppDataSource } from "../config/db";
import { Instructor } from "../entities/Instructor";

export async function getInstructorIdByUserId(userId: string | undefined) {
  const instructor = await AppDataSource.getRepository(Instructor).findOne({ where: { userId } });
  if (!instructor) throw new Error("查無講師資料");
  return instructor.id;
}
