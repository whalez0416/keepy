import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOAuthAndSupportTickets1739418000000 implements MigrationInterface {
    name = 'AddOAuthAndSupportTickets1739418000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add OAuth support fields to users table
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN IF NOT EXISTS "provider" varchar NOT NULL DEFAULT 'local'
        `);

        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN IF NOT EXISTS "provider_id" varchar
        `);

        // Make password_hash nullable for OAuth users
        await queryRunner.query(`
            ALTER TABLE "users" 
            ALTER COLUMN "password_hash" DROP NOT NULL
        `);

        // Create support_tickets table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "support_tickets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "subject" varchar NOT NULL,
                "message" text NOT NULL,
                "status" varchar NOT NULL DEFAULT 'open',
                "priority" varchar NOT NULL DEFAULT 'medium',
                "admin_response" text,
                "responded_by" varchar,
                "is_read" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "resolved_at" TIMESTAMP,
                "userId" uuid,
                CONSTRAINT "PK_support_tickets" PRIMARY KEY ("id"),
                CONSTRAINT "FK_support_tickets_user" FOREIGN KEY ("userId") 
                    REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // Create index on user_id for faster queries
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_support_tickets_userId" 
            ON "support_tickets" ("userId")
        `);

        // Create index on status for filtering
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_support_tickets_status" 
            ON "support_tickets" ("status")
        `);

        // Create index on is_read for admin dashboard
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_support_tickets_is_read" 
            ON "support_tickets" ("is_read")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop support_tickets table
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_tickets_is_read"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_tickets_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_tickets_userId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);

        // Revert users table changes
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "provider_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "provider"`);
    }
}
