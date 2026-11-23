import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleColumn1710000001000 implements MigrationInterface {
  name = 'AddUserRoleColumn1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'traveler'
        CONSTRAINT "chk_users_role" CHECK ("role" IN ('traveler', 'admin'));
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_role" ON "users" ("role");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role";`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role";`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role";`);
  }
}
