import "reflect-metadata";
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import { BridgeManagerService } from '../services/bridge-manager.service.js';

async function verifyDeployment() {
    try {
        console.log("Initializing database...");
        await AppDataSource.initialize();

        const siteRepo = AppDataSource.getRepository(Site);
        const bridgeManager = new BridgeManagerService();

        // 1. Find or update MinHospital site config
        let site = await siteRepo.findOne({ where: { domain: 'minhospital.co.kr' } });

        if (!site) {
            console.log("Site not found, creating dummy for verification...");
            site = siteRepo.create({
                site_name: "Min Hospital",
                target_url: "https://minhospital.co.kr",
                domain: "minhospital.co.kr",
                monitoring_interval: 5,
                is_active: true
            });
        }

        // Update SFTP info (Using credentials from conversation history)
        site.sftp_host = "minhospital.co.kr";
        site.sftp_user = "minhospital2008";
        site.sftp_pass = "minho3114*";

        await siteRepo.save(site);
        console.log(`Site config updated for ${site.domain}`);

        // 2. Deploy Universal Bridge
        console.log("Starting automated deployment...");
        const result = await bridgeManager.deployBridge(site.id);

        if (result.success) {
            console.log("✅ Deployment successful!");
            console.log(result.message);
        } else {
            console.error("❌ Deployment failed:", result.message);
        }

        process.exit(0);
    } catch (error: any) {
        console.error("Verification error:", error.message);
        process.exit(1);
    }
}

verifyDeployment();
