import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Todo {
  // 改用 uuid，並把 TypeScript 型別改成 string
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ default: false })
  completed!: boolean;
}
