import { MigrationInterface, QueryRunner } from "typeorm";

export class InitializeMigration1681234567890 implements MigrationInterface {
  up = async (queryRunner: QueryRunner): Promise<void> => {
    void queryRunner;
    // 初始化 migration 管理，無實際變更
  };

  down = async (queryRunner: QueryRunner): Promise<void> => {
    void queryRunner;
    // 無需還原
  };
}
