import { MonitorService } from "../services/monitor.service.js";
import { SpamHunterService } from "../services/spam-hunter.service.js";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";

// Monitoring logs for display (Keep in-memory for now, or move to DB later)
export const monitoringLogs: Array<{
    timestamp: Date;
    site_id: string; // For filtering by user's sites
    site_name: string;
    status: string;
    message: string;
}> = [];

const monitorService = new MonitorService();
const spamHunter = new SpamHunterService();

function addLog(site_id: string, site_name: string, status: string, message: string) {
    const log = {
        timestamp: new Date(),
        site_id,
        site_name,
        status,
        message
    };
    monitoringLogs.push(log);

    // Keep only last 500 logs to prevent memory overflow
    if (monitoringLogs.length > 500) {
        monitoringLogs.shift();
    }

    // Console log for server visibility
    const timeStr = log.timestamp.toLocaleTimeString('ko-KR');
    console.log(`[${timeStr}] [${site_name}] ${status}: ${message}`);
}

// Monitoring loop - runs every minute
async function monitoringSweep(force: boolean = false) {
    // Fetch active sites from DB
    const siteRepo = AppDataSource.getRepository(Site);
    const activeSites = await siteRepo.find({
        where: { is_active: true }
    });

    if (activeSites.length === 0) {
        console.log('[Monitoring] No active sites to monitor');
        return;
    }

    console.log(`\n========================================`);
    console.log(`[Monitoring] Starting sweep for ${activeSites.length} site(s) (Force: ${force})`);
    console.log(`========================================`);

    for (const site of activeSites) {
        // Check if it's time to monitor based on interval (Skip if forced)
        if (!force && site.last_checked_at) {
            const nextCheckTime = new Date(site.last_checked_at.getTime() + (site.monitoring_interval * 60 * 1000));
            if (new Date() < nextCheckTime) {
                // Not time yet
                continue;
            }
        }

        try {
            addLog(site.id, site.site_name, 'INFO', `🔍 Health check started for ${site.target_url}`);

            const result = await monitorService.checkHealth(site.target_url);

            if (result.success) {
                site.current_status = 'healthy';
                site.last_checked_at = new Date();

                // Save status update to DB
                await siteRepo.save(site);

                addLog(site.id, site.site_name, 'SUCCESS', `✅ Site is healthy (Status: ${result.status})`);

                // If DB credentials exist, run Spam Hunter
                if (site.db_host && site.db_user) {
                    addLog(site.id, site.site_name, 'INFO', `🛡️ Starting DB scan (Spam Hunter)`);
                    const spamResult = await spamHunter.cleanSpam(site.id);
                    if (spamResult.detected > 0) {
                        addLog(site.id, site.site_name, 'WARNING', `🔔 Detected ${spamResult.detected} suspected spam posts`);
                    } else {
                        addLog(site.id, site.site_name, 'SUCCESS', `💎 DB is clean. No spam detected.`);
                    }
                }
            } else {
                site.current_status = 'error';
                site.last_checked_at = new Date();

                // Save status update to DB
                await siteRepo.save(site);

                addLog(site.id, site.site_name, 'ERROR', `❌ Site is down (${result.error || 'Unknown error'})`);
            }
        } catch (error: any) {
            // Check if site still exists in memory context (it does, but ensure safe fail)
            site.current_status = 'error';
            // Save status update to DB
            await siteRepo.save(site);

            addLog(site.id, site.site_name, 'ERROR', `❌ Monitoring failed: ${error.message}`);
        }
    }

    console.log(`[Monitoring] Sweep completed\n`);
}

// Register or update site for monitoring
// Now largely redundant as we fetch from DB, but kept for logging/triggering immediate actions if needed
export function registerSiteForMonitoring(siteData: {
    id: string;
    site_name: string;
    domain?: string;
    specific_board_table?: string;
}) {
    console.log(`[registerSiteForMonitoring] Site registered/updated in DB: ${siteData.domain || siteData.site_name}`);
    addLog(siteData.id, siteData.site_name, "INFO", "✏️ Site configuration updated (DB Synced)");
}

// Start monitoring loop (every 1 minute)
let monitoringInterval: NodeJS.Timeout | null = null;

export function startMonitoring() {
    if (monitoringInterval) {
        console.log('[Monitoring] Already running');
        return;
    }

    console.log('\n🚀 [Monitoring] Starting monitoring service...');
    console.log('[Monitoring] Check interval: 1 minute');

    // Run immediately
    monitoringSweep();

    // Then run every minute
    monitoringInterval = setInterval(monitoringSweep, 60 * 1000);

    addLog('system', 'System', 'INFO', '🚀 Monitoring service started');
}

export async function triggerManualScan() {
    console.log('[Monitoring] Manual scan triggered');
    addLog('system', 'System', 'INFO', '🎯 Manual scan triggered by user');
    await monitoringSweep(true);
}

export function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('[Monitoring] Service stopped');
        addLog('system', 'System', 'INFO', '⏸️ Monitoring service stopped');
    }
}

