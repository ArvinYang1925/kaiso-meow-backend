import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "students" })
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // FK 欄位，對應到 users.id
  @Column({ name: "user_id", type: "uuid", unique: true, nullable: false })
  userId!: string;

  @Column({ name: "phone_number", length: 20, nullable: true })
  phoneNumber!: string;

  // Owning side: student.userId → users.id
  @OneToOne(() => User, (user) => user.student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
