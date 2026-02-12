import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { OnboardingService } from '../services/onboarding.service.js';
import { SpamHunterService } from '../services/spam-hunter.service.js';
import { MonitoringLog } from '../models/MonitoringLog.js';

async function verifyV1System() {
    try {
        console.log("🚀 Starting Keepy v1 System Verification...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const onboarding = new OnboardingService();
        const spamHunter = new SpamHunterService();

        // 1. Setup/Identify Min Hospital Site
        let site = await siteRepo.findOneBy({ domain: 'minhospital.co.kr' });
        if (!site) throw new Error("Min Hospital site not configured. Run deploy first.");

        // Reset state for clean verification
        site.onboarding_level = 0;
        site.target_board_table = undefined;
        site.last_scanned_id = undefined;
        site.last_scanned_at = undefined;
        await siteRepo.save(site);
        console.log("✅ Site state reset for verification.");

        // --- PHASE 1: Onboarding Flow ---

        console.log("\n📡 Phase 1: Onboarding Step 1 (Ping)...");
        const pingResult = await onboarding.checkPing(site.id);
        console.log("Ping Result:", pingResult);
        if (!pingResult.success) throw new Error("Step 1 failed");

        console.log("\n📡 Phase 1: Onboarding Step 2 (Discovery)...");
        const boards = await onboarding.getBoardCandidates(site.id);
        console.log(`Found ${boards.length} board candidates.`);
        if (boards.length === 0) throw new Error("Step 2 failed - No boards found");

        const targetTable = 'Board'; // Choosing 'Board' for verification
        console.log(`\n📡 Phase 1: Onboarding Step 3 (Linking ${targetTable})...`);
        await onboarding.linkBoard(site.id, targetTable);

        // Refresh site
        site = await siteRepo.findOneBy({ id: site.id }) as Site;
        console.log("Site Active State:", { level: site.onboarding_level, table: site.target_board_table, active: site.is_active });

        // --- PHASE 2: Monitoring & Scan ---

        console.log("\n🛡️ Phase 2: Running Spam Scan (Composite Logic)...");
        const scanResult = await spamHunter.cleanSpam(site.id);
        console.log("Scan Result:", scanResult);

        // Verify Checkpoints
        const updatedSite = await siteRepo.findOneBy({ id: site.id }) as Site;
        console.log("Site Markers Updated:", {
            last_id: updatedSite.last_scanned_id,
            last_at: updatedSite.last_scanned_at?.toISOString()
        });

        if (!updatedSite.last_scanned_id) {
            console.error("❌ Error: last_scanned_id was not updated.");
        }

        // Verify Logs
        const logs = await logRepo.find({ where: { site: { id: site.id } }, order: { created_at: 'DESC' }, take: 5 });
        console.log("\n📝 Recent Monitoring Logs Found:", logs.length);
        logs.forEach(l => {
            console.log(`- [${l.event_type}] ${l.message} (Score: ${l.meta?.score || 'N/A'})`);
        });

        console.log("\n✅ Keepy v1 Final System Verification Complete!");
        process.exit(0);

    } catch (error: any) {
        console.error("\n❌ Verification failed:", error.message);
        process.exit(1);
    }
}

verifyV1System();
