import { createHmac } from "crypto";
import { AppDataSource } from "../config/database.js";

const BRIDGE_URL = "https://minhospital.co.kr/keepy_bridge.php";

function buildHeaders(apiKey: string, timestampOverride?: number) {
    const timestamp = (timestampOverride ?? Math.floor(Date.now() / 1000)).toString();
    const signature = createHmac("sha256", apiKey)
        .update(apiKey + timestamp)
        .digest("hex");
    return {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signature,
    };
}

async function runTest(label: string, body: Record<string, any>, headers: Record<string, string>) {
    process.stdout.write(`\n🧪 [${label}]\n   → POST ${BRIDGE_URL}\n`);
    try {
        const res = await fetch(BRIDGE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
        const data = await res.json().catch(() => ({}));
        const icon = res.status === 200 ? "✅" : res.status === 403 ? "🔒" : "⚠️";
        console.log(`   ${icon} HTTP ${res.status}`);
        console.log(`   Response:`, JSON.stringify(data).slice(0, 140));
        return res.status;
    } catch (err: any) {
        console.log(`   ❌ Network error: ${err.message}`);
        return null;
    }
}

async function main() {
    // Fetch real credentials from DB
    await AppDataSource.initialize();
    const rows = await AppDataSource.query(`
        SELECT bridge_api_key, db_host, db_user, db_pass, db_name, db_port
        FROM sites WHERE domain = 'minhospital.co.kr' LIMIT 1;
    `);
    await AppDataSource.destroy();

    const s = rows[0];
    if (!s?.bridge_api_key) { console.error("❌ No bridge_api_key in DB"); process.exit(1); }

    const realKey: string = s.bridge_api_key;
    const dbParams = {
        db_host: s.db_host || 'localhost',
        db_user: s.db_user,
        db_pass: s.db_pass,
        db_name: s.db_name,
        db_port: s.db_port || '3306',
    };

    console.log(`\n🔑 API key: ${realKey.slice(0, 8)}...`);
    console.log(`💾 DB: ${dbParams.db_user}@${dbParams.db_host}/${dbParams.db_name}`);

    console.log("\n════════════════════════════════════════");
    console.log(" Keepy Bridge v2.0 — Security Test");
    console.log("════════════════════════════════════════");

    // Case 1: ✅ Valid key + DB params → expect 200
    const body1 = { action: 'test_connection', ...dbParams };
    const s1 = await runTest("Case 1: Valid key + DB params (expect 200)", body1, buildHeaders(realKey));

    // Case 2: 🔒 Wrong API key
    const s2 = await runTest("Case 2: Wrong API key (expect 403)", body1, buildHeaders("wrong-key-00000000"));

    // Case 3: 🔒 Stale timestamp (replay attack)
    const oldTs = Math.floor(Date.now() / 1000) - 601;
    const s3 = await runTest("Case 3: Stale timestamp 10min ago (expect 403)", body1, buildHeaders(realKey, oldTs));

    // Case 4: 🔒 Tampered signature
    const badSigH = { ...buildHeaders(realKey), "X-SIGNATURE": "badsig000" };
    const s4 = await runTest("Case 4: Tampered signature (expect 403)", body1, badSigH);

    // Summary
    const pass = (c: number | null, exp: number) =>
        c === exp ? `✅ PASS (${c})` : `❌ FAIL (got ${c}, expected ${exp})`;
    console.log("\n════════════════════════════════════════");
    console.log(" Test Summary");
    console.log("════════════════════════════════════════");
    console.log(`  Case 1 (valid + DB):        ${pass(s1, 200)}`);
    console.log(`  Case 2 (wrong key):         ${pass(s2, 403)}`);
    console.log(`  Case 3 (stale timestamp):   ${pass(s3, 403)}`);
    console.log(`  Case 4 (tampered sig):      ${pass(s4, 403)}`);
    console.log("");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
