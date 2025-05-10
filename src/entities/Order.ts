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

  @Column({ name: "original_price", type: "decimal", precision: 10, scale: 2, nullable: false })
  originalPrice!: number;

  @Column({ name: "order_price", type: "decimal", precision: 10, scale: 2, nullable: false })
  orderPrice!: number;

  @Column({ type: "varchar", length: 20, nullable: false })
  status!: string;

  @Column({ name: "coupon_id", type: "uuid", nullable: true })
  couponId?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ name: "paid_at", type: "timestamp", nullable: true })
  paidAt?: Date;

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
