import "reflect-metadata";
import { AppDataSource } from '../config/database.js';

async function checkSchema() {
    try {
        await AppDataSource.initialize();
        console.log("✅ DB Connected!");

        const result = await AppDataSource.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'sites'
            ORDER BY ordinal_position;
        `);

        console.log("\n📋 현재 'sites' 테이블 컬럼:");
        result.forEach((col: any) => {
            console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });

        // Code에서 Site 모델이 요구하는 컬럼
        const codeColumns = [
            'id', 'site_name', 'target_url', 'monitoring_interval', 'is_active',
            'self_healing_enabled', 'healing_command', 'db_host', 'db_user',
            'db_name', 'db_port', 'db_type', 'ftp_host', 'ftp_user', 'ftp_port',
            'sftp_host', 'sftp_user', 'remote_path', 'site_type', 'bridge_path',
            'bridge_version', 'domain', 'onboarding_status', 'onboarding_level',
            'discovered_boards', 'linked_boards', 'target_board_table',
            'specific_board_table', 'can_user_delete_spam', 'last_scanned_id',
            'last_scanned_at', 'last_checked_at', 'current_status',
            'created_at', 'updated_at'
        ];

        const dbColumns = result.map((c: any) => c.column_name);
        const missing = codeColumns.filter(c => !dbColumns.includes(c));
        const extra = dbColumns.filter((c: string) => !codeColumns.includes(c) && c !== 'userId');

        if (missing.length > 0) {
            console.log("\n❌ DB에 없는 컬럼 (마이그레이션 필요):", missing);
        } else {
            console.log("\n✅ 모든 컬럼 존재!");
        }

        if (extra.length > 0) {
            console.log("ℹ️  DB에만 있는 컬럼:", extra);
        }

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

checkSchema();
