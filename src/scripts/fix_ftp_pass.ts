import { AppDataSource } from "../config/database.js";

/**
 * One-time script: adds ftp_pass column and backfills minhospital FTP password.
 * Safe to re-run (IF NOT EXISTS).
 */
async function fixFtpPass() {
    await AppDataSource.initialize();
    const runner = AppDataSource.createQueryRunner();

    console.log("Adding ftp_pass column...");
    await runner.query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS ftp_pass VARCHAR(255);`);
    console.log("✅ ftp_pass column added.");

    // Backfill FTP password for minhospital (only if not already set)
    const result = await runner.query(`
        UPDATE sites
        SET ftp_pass = 'minho3114*'
        WHERE domain = 'minhospital.co.kr'
          AND (ftp_pass IS NULL OR ftp_pass = '');
    `);
    console.log(`✅ ftp_pass set for minhospital row.`);

    await runner.release();
    await AppDataSource.destroy();
    console.log("Done.");
}

fixFtpPass().catch(e => { console.error("❌", e.message); process.exit(1); });
