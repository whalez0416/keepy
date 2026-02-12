import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { SpamHunterService } from '../services/spam-hunter.service.js';
import { MonitoringLog } from '../models/MonitoringLog.js';

async function checkManualPost() {
    try {
        console.log("🕵️ Checking for manually posted spam...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const spamHunter = new SpamHunterService();

        const site = await siteRepo.findOneBy({ domain: 'minhospital.co.kr' });
        if (!site) throw new Error("Site not found");

        console.log(`\n🚀 Triggering Immediate Scan for ${site.domain}...`);
        const result = await spamHunter.cleanSpam(site.id);

        console.log("\n📊 Scan Result:", result);

        // Check for latest logs if any spam was detected
        if (result.detected > 0) {
            const latestLogs = await logRepo.find({
                where: { site: { id: site.id } },
                order: { created_at: 'DESC' },
                take: result.detected
            });

            console.log("\n🚨 Detected Spam Details:");
            latestLogs.forEach(log => {
                console.log(`- [${log.event_type}] ${log.message}`);
                console.log(`  Reasons: ${log.meta?.reasons?.join(', ')}`);
                console.log(`  Score: ${log.meta?.score}`);
            });
        } else {
            console.log("\n✅ No spam detected in the latest window.");
            console.log(`Current markers: ID=${site.last_scanned_id}, Date=${site.last_scanned_at?.toISOString()}`);
        }

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Scan Failed:", error.message);
        process.exit(1);
    }
}

checkManualPost();
