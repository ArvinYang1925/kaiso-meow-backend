import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Course } from "./Course";
import { StudentProgress } from "./StudentProgress";

@Entity({ name: "sections" })
export class Section {
  @PrimaryGeneratedColumn("uuid", { name: "id" })
  id!: string;

  @ManyToOne(() => Course, (course) => course.sections, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "varchar", length: 100, nullable: false, name: "title" })
  title!: string;

  @Column({ type: "text", nullable: true, name: "content" })
  content?: string;

  @Column({ type: "varchar", length: 2048, nullable: true, name: "video_url" })
  videoUrl?: string;

  @Column({ type: "boolean", default: false, nullable: false, name: "is_published" })
  isPublished!: boolean;

  @Column({ type: "int", default: 0, nullable: false, name: "order_index" })
  orderIndex!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;

  @OneToMany(() => StudentProgress, (progress) => progress.section)
  progresses?: StudentProgress[];
}
