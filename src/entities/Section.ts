import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { Course } from "./Course";
import { StudentProgress } from "./StudentProgress";

@Entity({ name: "sections" })
export class Section {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Course, (course) => course.sections, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ length: 100 })
  title!: string;

  @Column("text", { nullable: true })
  content!: string;

  @Column({ length: 2048, nullable: true })
  video_url!: string;

  @Column({ default: false })
  is_published!: boolean;

  @Column({ type: "int", default: 0 })
  order_index!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => StudentProgress, (progress) => progress.section)
  progresses!: StudentProgress[];
}
