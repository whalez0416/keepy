import { AppDataSource } from "../config/database.js";

/**
 * Backfills FTP credentials for minhospital.co.kr site.
 */
async function setFtpCredentials() {
    await AppDataSource.initialize();

    await AppDataSource.query(`
        UPDATE sites
        SET
            ftp_host = 'minhospital.co.kr',
            ftp_user = 'minhospital2008',
            ftp_pass = 'minho3114*',
            ftp_port = '21'
        WHERE domain = 'minhospital.co.kr';
    `);

    const rows = await AppDataSource.query(
        `SELECT id, domain, ftp_host, ftp_user, ftp_port FROM sites WHERE domain = 'minhospital.co.kr';`
    );
    console.log("✅ Updated:", rows);

    await AppDataSource.destroy();
}

setFtpCredentials().catch(e => { console.error("❌", e.message); process.exit(1); });
