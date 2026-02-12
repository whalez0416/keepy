import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { SpamHunterService } from '../services/spam-hunter.service.js';
import { MonitoringLog, MonitoringEventType } from '../models/MonitoringLog.js';
import axios from "axios";

async function verifySpamFlow() {
    try {
        console.log("🚀 Starting Read-Only Spam Flow Verification...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const spamHunter = new SpamHunterService();

        // 1. Identification
        let site = await siteRepo.findOneBy({ domain: 'minhospital.co.kr' });
        if (!site) throw new Error("Site not found");

        const bridgeUrl = `https://${site.domain}/keepy_bridge.php`;
        const apiKey = "keepy_secret_2024";

        console.log(`\n🔍 Step 1: verifying Bridge v1.1.5 Trace Tuning...`);
        const statusResponse = await axios.post(bridgeUrl, { action: 'list_boards' }, { headers: { 'X-API-KEY': apiKey } });
        console.log("Success Trace (Summarized):", statusResponse.data.trace);
        if (statusResponse.data.trace.length > 5) {
            console.warn("⚠️ Trace might be too detailed for success response.");
        } else {
            console.log("✅ Success trace is concise.");
        }

        console.log(`\n🔍 Step 2: verifying debug_spam_check (Read-Only)...`);
        const debugResponse = await axios.post(bridgeUrl, {
            action: 'debug_spam_check',
            table: 'Board',
            post_id: 2 // Using known ID from previous runs
        }, { headers: { 'X-API-KEY': apiKey } });

        if (debugResponse.data.success) {
            console.log("Remote Post Fetched:", debugResponse.data.raw_data ? "Yes" : "No");
            console.log("Detailed Trace for Debug:", debugResponse.data.trace);

            if (debugResponse.data.raw_data) {
                // Simulate Spam Detection on this data
                console.log("\n⚖️ Step 3: Local Logic & Reason Verification...");
                // Note: We used existing data, it might not be spam.
                // Let's manually trigger logEvent to verify persistence.

                const mockSpamData = {
                    id: 9999,
                    subject: "의도적 스팸 테스트 [카지노]",
                    content: "이것은 검증용 데이터입니다. 실제 DB에는 저장되지 않습니다.",
                    date: new Date().toISOString()
                };

                // Inspecting SpamHunter judgment
                const judgment = (spamHunter as any).judgeSpam(mockSpamData);
                console.log("Test Judgment:", judgment);

                if (judgment.isSpam && judgment.reasons.includes("Keyword match (Gambling)")) {
                    console.log("✅ Standardized Reasoning OK.");
                } else {
                    console.error("❌ Reasoning logic mismatch.");
                }

                console.log("\n📝 Step 4: Event Log Persistence Test...");
                await (spamHunter as any).logEvent(site, MonitoringEventType.SPAM_DETECTED,
                    "Local Flow Verification Test",
                    statusResponse.data.trace,
                    { reasons: judgment.reasons, score: judgment.score }
                );

                const latestLog = await logRepo.findOne({
                    where: { event_type: MonitoringEventType.SPAM_DETECTED },
                    order: { created_at: 'DESC' }
                });

                if (latestLog && latestLog.message === "Local Flow Verification Test") {
                    console.log("✅ MonitoringLog entry verified in Local DB.");
                    console.log("Persisted Meta:", latestLog.meta);
                } else {
                    throw new Error("Log persistence failed.");
                }
            }
        }

        console.log("\n✅ Final v1 Verification Complete!");
        process.exit(0);

    } catch (error: any) {
        console.error("\n❌ Verification failed:", error.message);
        process.exit(1);
    }
}

verifySpamFlow();
