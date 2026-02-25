import { AppDataSource } from "../config/database.js";

/**
 * Adds missing columns to the `sites` table and issues a bridge_api_key
 * to any existing site that does not have one yet.
 *
 * Safe to re-run: all ALTER TABLE statements use IF NOT EXISTS.
 *
 * Run with:
 *   node --loader ts-node/esm src/scripts/add_missing_columns.ts
 */
async function addMissingColumns() {
    await AppDataSource.initialize();
    const runner = AppDataSource.createQueryRunner();

    console.log("🔧 Adding missing columns to `sites` table...\n");

    const columns: { name: string; definition: string }[] = [
        // Phase 2 columns (may already exist)
        { name: "db_port", definition: "VARCHAR(10)" },
        { name: "db_type", definition: "VARCHAR(50)" },
        { name: "ftp_host", definition: "VARCHAR(255)" },
        { name: "ftp_user", definition: "VARCHAR(255)" },
        { name: "ftp_port", definition: "VARCHAR(10)" },
        { name: "bridge_path", definition: "VARCHAR(512)" },
        { name: "onboarding_status", definition: "VARCHAR(50) DEFAULT 'pending'" },
        { name: "discovered_boards", definition: "JSONB" },
        { name: "linked_boards", definition: "JSONB" },
        // Security (v2)
        { name: "bridge_api_key", definition: "VARCHAR(255)" },
    ];

    for (const col of columns) {
        try {
            await runner.query(
                `ALTER TABLE sites ADD COLUMN IF NOT EXISTS "${col.name}" ${col.definition};`
            );
            console.log(`  ✅ ${col.name}`);
        } catch (err: any) {
            console.error(`  ❌ ${col.name}: ${err.message}`);
        }
    }

    // ── Backfill bridge_api_key for existing sites ────────────────────────────
    console.log("\n🔑 Issuing bridge_api_key for sites that don't have one...");
    const sites = await runner.query(
        `SELECT id FROM sites WHERE bridge_api_key IS NULL;`
    );

    for (const site of sites) {
        const key = crypto.randomUUID(); // Node 21+ native; polyfilled by TypeScript
        await runner.query(
            `UPDATE sites SET bridge_api_key = $1 WHERE id = $2;`,
            [key, site.id]
        );
        console.log(`  ✅ Site ${site.id} → key issued`);
    }

    if (sites.length === 0) {
        console.log("  ✅ All sites already have a bridge_api_key.");
    }

    await runner.release();
    await AppDataSource.destroy();
    console.log("\n✨ Done.");
}

addMissingColumns().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
