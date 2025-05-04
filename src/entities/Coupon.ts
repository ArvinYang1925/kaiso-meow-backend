import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

@Entity({ name: "coupons" })
export class Coupon {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false, name: "coupon_name" })
  couponName!: string;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false, name: "code" })
  code!: string;

  @Column({ type: "varchar", length: 10, nullable: false, name: "type" })
  type!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false, name: "value" })
  value!: number;

  @Column({ type: "timestamp", nullable: true, name: "expires_at" })
  expiresAt?: Date;

  @Column({ type: "timestamp", nullable: true, name: "starts_at" })
  startsAt?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
