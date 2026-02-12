import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AddMultiTenancy1707724800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add system_role column to users table
        await queryRunner.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS system_role VARCHAR DEFAULT 'user'
        `);

        // 2. Set existing admins as superadmin
        await queryRunner.query(`
            UPDATE users SET system_role = 'superadmin' WHERE role = 'admin'
        `);

        // 3. Create site_members table
        await queryRunner.createTable(new Table({
            name: "site_members",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "userId",
                    type: "uuid"
                },
                {
                    name: "siteId",
                    type: "uuid"
                },
                {
                    name: "role",
                    type: "varchar",
                    default: "'staff'"
                },
                {
                    name: "can_delete_spam",
                    type: "boolean",
                    default: true
                },
                {
                    name: "can_view_logs",
                    type: "boolean",
                    default: true
                },
                {
                    name: "can_manage_members",
                    type: "boolean",
                    default: false
                },
                {
                    name: "joined_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);

        // 4. Add foreign keys
        await queryRunner.createForeignKey("site_members", new TableForeignKey({
            columnNames: ["userId"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("site_members", new TableForeignKey({
            columnNames: ["siteId"],
            referencedTableName: "sites",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE"
        }));

        // 5. Add unique index to prevent duplicate memberships
        await queryRunner.createIndex("site_members", new TableIndex({
            name: "IDX_site_member_unique",
            columnNames: ["userId", "siteId"],
            isUnique: true
        }));

        // 6. Migrate existing data - create site_members from existing userId relationships
        const hasUserIdColumn = await queryRunner.hasColumn("sites", "userId");

        if (hasUserIdColumn) {
            await queryRunner.query(`
                INSERT INTO site_members (id, "userId", "siteId", role, can_delete_spam, can_manage_members)
                SELECT uuid_generate_v4(), "userId", id, 'owner', true, true
                FROM sites
                WHERE "userId" IS NOT NULL
            `);
        }

        // 7. KEEP userId column for backward compatibility (Hybrid approach)
        // Do NOT drop the column - it will be synced with site_members

        console.log("[MIGRATION] Multi-tenancy migration completed (Hybrid mode - userId preserved)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback: Drop site_members table
        await queryRunner.dropTable("site_members");

        // Remove system_role column
        await queryRunner.dropColumn("users", "system_role");
    }
}
