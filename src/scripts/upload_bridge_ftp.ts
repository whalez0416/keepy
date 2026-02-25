import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';

/**
 * Deploys keepy_bridge.php to a site's FTP server.
 *
 * Process:
 *   1. Read the template bridge file (contains ##KEEPY_API_KEY## placeholder)
 *   2. Load the site's unique bridge_api_key from DB
 *   3. Substitute the placeholder with the real key → write to a temp file
 *   4. Upload the temp file via FTP
 *   5. Delete the temp file immediately (key never persists on disk)
 *
 * Usage:
 *   node --loader ts-node/esm src/scripts/upload_bridge_ftp.ts [siteId]
 *
 * If siteId is omitted the first active site is used.
 */

const PLACEHOLDER = '##KEEPY_API_KEY##';
const BRIDGE_TEMPLATE = path.resolve(process.cwd(), 'keepy_bridge.php');
const REMOTE_PATH = '/www/keepy_bridge.php';

async function uploadBridge() {
    // ── 1. Connect to DB ──────────────────────────────────────────────────────
    await AppDataSource.initialize();
    const siteRepo = AppDataSource.getRepository(Site);

    const siteId = process.argv[2] ?? null;

    // Use raw SQL to safely fetch select:false fields (ftp_pass, bridge_api_key)
    const whereClause = siteId
        ? `WHERE id = '${siteId.replace(/'/g, "''")}'`
        : `WHERE is_active = true LIMIT 1`;

    const rows = await AppDataSource.query(
        `SELECT id, domain, ftp_host, ftp_user, ftp_pass, ftp_port, bridge_api_key
         FROM sites ${whereClause};`
    );

    const site = rows[0] ?? null;

    if (!site) {
        console.error('❌ Site not found in database.');
        process.exit(1);
    }

    const { domain, ftp_host, ftp_user } = site;
    const ftp_pass = (site as any).ftp_pass as string | undefined;
    const apiKey = (site as any).bridge_api_key as string | undefined;

    console.log(`\n📡 Target site : ${domain}`);

    if (!apiKey) {
        console.error('❌ bridge_api_key is not set for this site.');
        console.error('   Run: node --loader ts-node/esm src/scripts/add_missing_columns.ts');
        process.exit(1);
    }

    if (!ftp_host || !ftp_user || !ftp_pass) {
        console.error('❌ FTP credentials are incomplete (ftp_host / ftp_user / ftp_pass).');
        process.exit(1);
    }

    // ── 2. Build the personalised bridge file ─────────────────────────────────
    const template = fs.readFileSync(BRIDGE_TEMPLATE, 'utf-8');

    if (!template.includes(PLACEHOLDER)) {
        console.error(`❌ Bridge template does not contain the placeholder "${PLACEHOLDER}".`);
        console.error('   Make sure keepy_bridge.php has not been manually modified.');
        process.exit(1);
    }

    const personalised = template.replaceAll(PLACEHOLDER, apiKey);

    // Write to a temp file with a random suffix so parallel uploads don't collide
    const tmpPath = path.resolve(process.cwd(), `.keepy_bridge_deploy_${Date.now()}.php`);
    fs.writeFileSync(tmpPath, personalised, 'utf-8');
    console.log(`🔑 Key embedded into temp file: ${path.basename(tmpPath)}`);

    // ── 3. Upload via FTP ─────────────────────────────────────────────────────
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Uncomment for debug output

    try {
        await client.access({
            host: ftp_host,
            user: ftp_user,
            password: ftp_pass,
            secure: false,
        });

        console.log('✅ FTP connected.');
        console.log(`📤 Uploading → ${REMOTE_PATH} ...`);
        await client.uploadFrom(tmpPath, REMOTE_PATH);
        console.log('✅ Upload complete!');

    } finally {
        // ── 4. Always clean up the temp file ─────────────────────────────────
        client.close();
        if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
            console.log('🗑️  Temp file deleted.');
        }
        await AppDataSource.destroy();
    }
}

uploadBridge().catch((err) => {
    console.error('❌ Upload failed:', err.message);
    process.exit(1);
});
