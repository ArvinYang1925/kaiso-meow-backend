import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Section } from "./Section";

@Entity({ name: "student_progress" })
export class StudentProgress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.progresses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, (course) => course.progresses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @ManyToOne(() => Section, (section) => section.progresses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "section_id" })
  section!: Section;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  progress_percentage!: number;

  @Column({ type: "int", nullable: true })
  last_position!: number;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "int", nullable: true })
  time_spent!: number;

  @Column({ default: false })
  is_completed!: boolean;
}
