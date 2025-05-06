import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import { User } from "./User";
import { Section } from "./Section";
import { Order } from "./Order";
import { StudentProgress } from "./StudentProgress";

@Entity({ name: "courses" })
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  title!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  subtitle?: string;

  @Column("text", { nullable: false })
  description!: string;

  @Column("text", { nullable: true })
  highlight?: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: false })
  duration!: number;

  @Column({ name: "is_published", default: true, nullable: false })
  isPublished!: boolean;

  @Column({ type: "int", nullable: false })
  price!: number;

  @Column({ name: "is_free", default: false, nullable: false })
  isFree!: boolean;

  @Column({ name: "cover_url", type: "varchar", length: 2048, nullable: true })
  coverUrl?: string;

  @Column({ name: "instructor_id", type: "uuid", nullable: false })
  instructorId!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  @OneToMany(() => Section, (section) => section.course)
  sections?: Section[];

  @OneToMany(() => Order, (order) => order.course)
  orders?: Order[];

  @OneToMany(() => StudentProgress, (progress) => progress.course)
  progresses?: StudentProgress[];

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "instructor_id" })
  instructor!: User;
}
