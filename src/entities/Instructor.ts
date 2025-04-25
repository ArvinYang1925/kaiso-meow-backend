import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "instructors" })
export class Instructor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", unique: true, nullable: false })
  userId!: string;

  @Column({ type: "text", nullable: true })
  introduction!: string;

  @OneToOne(() => User, (user) => user.instructor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
