import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { SpamHunterService } from '../services/spam-hunter.service.js';
import { MonitoringLog } from '../models/MonitoringLog.js';

async function scanCorrectTable() {
    try {
        console.log("🕵️ Switching to md_board and scanning...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const spamHunter = new SpamHunterService();

        const site = await siteRepo.findOneBy({ domain: 'minhospital.co.kr' });
        if (!site) throw new Error("Site not found");

        // Update target table
        site.target_board_table = 'md_board';
        // Reset markers to scan from today (or just 1 hour ago) to find the new post
        site.last_scanned_id = undefined;
        site.last_scanned_at = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

        await siteRepo.save(site);
        console.log(`✅ Site target updated to md_board. Scanning from ${site.last_scanned_at.toISOString()}`);

        const result = await spamHunter.cleanSpam(site.id);
        console.log("\n📊 Scan Result:", result);

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
            console.log("\n✅ No spam detected. (Did you use keywords like '카지노', '도박', or '대출'?)");
        }

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Scan Failed:", error.message);
        process.exit(1);
    }
}

scanCorrectTable();
