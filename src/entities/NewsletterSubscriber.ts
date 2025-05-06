import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "newsletter_subscribers" })
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 320, unique: true, nullable: false })
  email!: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId?: string;

  @Column({ name: "is_verified", default: false, nullable: false })
  isVerified!: boolean;

  @Column({ name: "is_active", default: true, nullable: false })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  // 可選的 userId，代表訂閱者也可能是某個使用者
  @OneToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
