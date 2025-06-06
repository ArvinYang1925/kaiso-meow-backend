import "reflect-metadata";
import { DataSource } from "typeorm";
import { Todo } from "../entities/Todo";
import { User } from "../entities/User";
import { Student } from "../entities/Student";
import { Instructor } from "../entities/Instructor";
import { Order } from "../entities/Order";
import { StudentProgress } from "../entities/StudentProgress";
import { NewsletterSubscriber } from "../entities/NewsletterSubscriber";
import { Course } from "../entities/Course";
import { Section } from "../entities/Section";
import { Coupon } from "../entities/Coupon";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Todo, User, Student, Instructor, Order, StudentProgress, NewsletterSubscriber, Course, Section, Coupon],
  synchronize: false, // 開發階段可以 true，正式環境建議改成 false
  logging: true,
  ssl: { rejectUnauthorized: false },
  migrations: ["src/migrations/*.js"],
});
