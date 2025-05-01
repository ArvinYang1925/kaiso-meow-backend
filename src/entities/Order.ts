import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Coupon } from "./Coupon";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", nullable: false })
  userId!: string;

  @Column({ name: "course_id", type: "uuid", nullable: false })
  courseId!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  original_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  order_price!: number;

  @Column({ type: "varchar", length: 20, nullable: false })
  status!: string;

  @Column({ name: "coupon_id", type: "uuid", nullable: true })
  couponId?: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  paid_at?: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, (course) => course.orders, { onDelete: "SET NULL" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @ManyToOne(() => Coupon, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "coupon_id" })
  coupon?: Coupon;
}
