import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from "typeorm";
import { Student } from "./Student";
import { Instructor } from "./Instructor";
import { Order } from "./Order";
import { StudentProgress } from "./StudentProgress";
import { NewsletterSubscriber } from "./NewsletterSubscriber";
export type UserRole = "student" | "instructor";
@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 320, unique: true, nullable: false })
  email!: string;

  @Column({ type: "varchar", length: 72, nullable: false })
  password!: string;

  @Column({ type: "varchar", length: 10, nullable: false })
  role!: UserRole;

  @Column({ name: "profile_url", length: 2048, nullable: true })
  profileUrl?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // 依照 role 不同，User 可能有 Student 或 Instructor
  @OneToOne(() => Student, (student) => student.user)
  student?: Student;

  @OneToOne(() => Instructor, (instructor) => instructor.user)
  instructor?: Instructor;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => StudentProgress, (progress) => progress.user)
  progresses!: StudentProgress[];

  @OneToMany(() => NewsletterSubscriber, (subscriber) => subscriber.user)
  newsletterSubscriptions!: NewsletterSubscriber[];
}
