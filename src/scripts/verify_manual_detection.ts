import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { SpamHunterService } from '../services/spam-hunter.service.js';
import { MonitoringLog } from '../models/MonitoringLog.js';

async function verifyManualDetection() {
    try {
        console.log("🕵️ Verifying detection for ID: 24437...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const spamHunter = new SpamHunterService();

        const site = await siteRepo.findOneBy({ domain: 'minhospital.co.kr' });
        if (!site) throw new Error("Site not found");

        // Set BOTH markers to today 16:00 to skip old data
        site.last_scanned_id = "24430";
        site.last_scanned_at = new Date("2026-02-09T16:00:00");
        site.target_board_table = "md_board";
        await siteRepo.save(site);

        console.log(`🚀 Scanning ${site.domain} from ID ${site.last_scanned_id} and Date ${site.last_scanned_at.toISOString()}`);
        const result = await spamHunter.cleanSpam(site.id);

        console.log("\n📊 Scan Result:", result);

        if (result.detected > 0) {
            const latestLog = await logRepo.findOne({
                where: { site: { id: site.id } },
                order: { created_at: 'DESC' }
            });

            if (latestLog) {
                console.log("\n✅ SUCCESS: Spam Detected and Logged!");
                console.log(`- Type: ${latestLog.event_type}`);
                console.log(`- Message: ${latestLog.message}`);
                console.log(`- Reasons: ${latestLog.meta?.reasons?.join(', ')}`);
                console.log(`- Score: ${latestLog.meta?.score}`);
            }
        } else {
            console.log("\n❌ FAIL: Spam not detected even in target window.");
        }

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Failed:", error.message);
        process.exit(1);
    }
}

verifyManualDetection();
