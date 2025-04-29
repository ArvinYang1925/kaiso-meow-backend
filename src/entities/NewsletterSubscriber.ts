import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "newsletter_subscribers" })
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 50 })
  name!: string;

  @Column({ length: 320, unique: true })
  email!: string;

  @ManyToOne(() => User, (user) => user.newsletterSubscriptions, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ default: false })
  is_verified!: boolean;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
