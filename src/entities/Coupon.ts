import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "coupons" })
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  coupon_name!: string;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 10 })
  type!: string; // 'percentage' or 'fixed'

  @Column({ type: "decimal", precision: 10, scale: 2 })
  value!: number;

  @Column({ type: "timestamp", nullable: true })
  expires_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  starts_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "timestamp", nullable: true, default: () => "now()" })
  deleted_at!: Date;
}
