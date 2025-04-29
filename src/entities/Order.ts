import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Coupon } from "./Coupon";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Course, (course) => course.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  original_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  order_price!: number;

  @Column({ length: 20 })
  status!: string;

  @ManyToOne(() => Coupon, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "coupon_id" })
  coupon!: Coupon;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: "timestamp" })
  paid_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
