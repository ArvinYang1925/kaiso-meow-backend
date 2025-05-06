import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Section } from "./Section";

@Entity({ name: "student_progress" })
export class StudentProgress {
  @PrimaryGeneratedColumn("uuid", { name: "id" })
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

  @Column({ type: "boolean", default: false, nullable: false, name: "is_completed" })
  isCompleted!: boolean;
}
