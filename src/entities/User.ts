import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from "typeorm";
import { Student } from "./Student";
import { Instructor } from "./Instructor";
import { Order } from "./Order";
import { StudentProgress } from "./StudentProgress";
import { NewsletterSubscriber } from "./NewsletterSubscriber";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 50 })
  name!: string;

  @Column({ length: 320, unique: true })
  email!: string;

  @Column({ length: 72 })
  password!: string;

  @Column({ length: 10 })
  role!: string;

  @Column({ length: 2048, nullable: true })
  profile_url!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => Student, (student) => student.user)
  student!: Student;

  @OneToOne(() => Instructor, (instructor) => instructor.user)
  instructor!: Instructor;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => StudentProgress, (progress) => progress.user)
  progresses!: StudentProgress[];

  @OneToMany(() => NewsletterSubscriber, (subscriber) => subscriber.user)
  newsletterSubscriptions!: NewsletterSubscriber[];
}
