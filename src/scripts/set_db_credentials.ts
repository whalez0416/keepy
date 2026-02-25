import { AppDataSource } from "../config/database.js";

/**
 * Backfills minhospital.co.kr's DB connection info into Keepy's sites table.
 * This data is sent to keepy_bridge.php at request time (bridge stores no credentials).
 */
async function setDbCredentials() {
    await AppDataSource.initialize();

    await AppDataSource.query(`
        UPDATE sites
        SET
            db_host = 'localhost',
            db_user = 'minhospital2008',
            db_pass = 'minho3114*',
            db_name = 'minhospital2008',
            db_port = '3306',
            db_type = 'mysql'
        WHERE domain = 'minhospital.co.kr';
    `);

    const rows = await AppDataSource.query(
        `SELECT id, domain, db_host, db_user, db_name, db_port FROM sites WHERE domain = 'minhospital.co.kr';`
    );
    console.log("✅ DB credentials updated:", rows);

    await AppDataSource.destroy();
}

setDbCredentials().catch(e => { console.error("❌", e.message); process.exit(1); });
