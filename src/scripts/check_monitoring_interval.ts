import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";

async function checkMonitoringInterval() {
    try {
        await AppDataSource.initialize();
        console.log("✅ Database connected");

        const siteRepo = AppDataSource.getRepository(Site);
        const sites = await siteRepo.find();

        console.log("\n📊 Site Monitoring Configuration:");
        console.log("=".repeat(60));

        for (const site of sites) {
            console.log(`\nSite: ${site.site_name}`);
            console.log(`  ID: ${site.id}`);
            console.log(`  Domain: ${site.domain}`);
            console.log(`  Monitoring Interval: ${site.monitoring_interval} minutes`);
            console.log(`  Last Checked: ${site.last_checked_at}`);
            console.log(`  Current Status: ${site.current_status}`);
            console.log(`  Is Active: ${site.is_active}`);

            if (site.last_checked_at) {
                const nextCheck = new Date(site.last_checked_at.getTime() + (site.monitoring_interval * 60 * 1000));
                console.log(`  Next Check Time: ${nextCheck.toLocaleString('ko-KR')}`);
                console.log(`  Minutes until next check: ${Math.round((nextCheck.getTime() - Date.now()) / 60000)}`);
            }
        }

        console.log("\n" + "=".repeat(60));
        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

checkMonitoringInterval();
