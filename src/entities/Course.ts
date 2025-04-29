import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Section } from "./Section";
import { Order } from "./Order";
import { StudentProgress } from "./StudentProgress";

@Entity({ name: "courses" })
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100 })
  title!: string;

  @Column({ length: 150, nullable: true })
  subtitle!: string;

  @Column("text")
  description!: string;

  @Column("text", { nullable: true })
  highlight!: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  duration!: number;

  @Column({ default: true })
  is_published!: boolean;

  @Column("int")
  price!: number;

  @Column({ default: false })
  is_free!: boolean;

  @Column({ length: 2048, nullable: true })
  cover_url!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "instructor_id" })
  instructor!: User;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Section, (section) => section.course)
  sections!: Section[];

  @OneToMany(() => Order, (order) => order.course)
  orders!: Order[];

  @OneToMany(() => StudentProgress, (progress) => progress.course)
  progresses!: StudentProgress[];
}
