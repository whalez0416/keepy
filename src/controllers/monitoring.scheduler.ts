import { MonitorService } from "../services/monitor.service.js";
import { SpamHunterService } from "../services/spam-hunter.service.js";

interface Site {
    id: string;
    site_name: string;
    target_url: string;
    monitoring_interval: number;
    is_active: boolean;
    current_status: string;
    user_id?: string; // Associated user ID for multi-tenancy
    domain?: string; // 도메인 (예: minhospital.co.kr)
    db_host?: string;
    db_user?: string;
    db_pass?: string;
    db_name?: string;
    last_checked_at?: Date;
    created_at: Date;
}

// In-memory storage
const sites: Site[] = [];
const monitorService = new MonitorService();
const spamHunter = new SpamHunterService();

// Monitoring logs for display
export const monitoringLogs: Array<{
    timestamp: Date;
    site_id: string; // For filtering by user's sites
    site_name: string;
    status: string;
    message: string;
}> = [];

function addLog(site_id: string, site_name: string, status: string, message: string) {
    const log = {
        timestamp: new Date(),
        site_id,
        site_name,
        status,
        message
    };
    monitoringLogs.push(log);

    // Keep only last 100 logs
    if (monitoringLogs.length > 100) {
        monitoringLogs.shift();
    }

    // Console log for server visibility
    const timeStr = log.timestamp.toLocaleTimeString('ko-KR');
    console.log(`[${timeStr}] [${site_name}] ${status}: ${message}`);
}

// Monitoring loop - runs every minute
async function monitoringSweep() {
    const activeSites = sites.filter(s => s.is_active);

    if (activeSites.length === 0) {
        console.log('[Monitoring] No active sites to monitor');
        return;
    }

    console.log(`\n========================================`);
    console.log(`[Monitoring] Starting sweep for ${activeSites.length} site(s)`);
    console.log(`========================================`);

    for (const site of activeSites) {
        try {
            addLog(site.id, site.site_name, 'INFO', `🔍 Health check started for ${site.target_url}`);

            const result = await monitorService.checkHealth(site.target_url);

            if (result.success) {
                site.current_status = 'healthy';
                site.last_checked_at = new Date();
                addLog(site.id, site.site_name, 'SUCCESS', `✅ Site is healthy (Status: ${result.status})`);

                // If DB credentials exist, run Spam Hunter
                if (site.db_host && site.db_user) {
                    addLog(site.id, site.site_name, 'INFO', `🛡️ Starting DB scan (Spam Hunter)`);
                    const spamResult = await spamHunter.cleanSpam(site);
                    if (spamResult.deleted > 0) {
                        addLog(site.id, site.site_name, 'WARNING', `✨ Cleaned ${spamResult.deleted} spam posts from DB`);
                    } else {
                        addLog(site.id, site.site_name, 'SUCCESS', `💎 DB is clean. No spam detected.`);
                    }
                }
            } else {
                site.current_status = 'error';
                site.last_checked_at = new Date();
                addLog(site.id, site.site_name, 'ERROR', `❌ Site is down (${result.error || 'Unknown error'})`);
            }
        } catch (error: any) {
            site.current_status = 'error';
            addLog(site.id, site.site_name, 'ERROR', `❌ Monitoring failed: ${error.message}`);
        }
    }

    console.log(`[Monitoring] Sweep completed\n`);
}

// Register or update site for monitoring
export function registerSiteForMonitoring(siteData: {
    id: string;
    site_name: string;
    target_url: string;
    monitoring_interval: number;
    is_active: boolean;
    current_status: string;
    domain?: string;
    db_host?: string;
    db_user?: string;
    db_pass?: string;
    db_name?: string;
}) {
    console.log(`[registerSiteForMonitoring] Received domain: ${siteData.domain}`);
    const existing = sites.findIndex(s => s.id === siteData.id);
    if (existing !== -1) {
        // Update existing
        sites[existing] = { ...siteData, created_at: sites[existing].created_at };
        addLog(siteData.id, siteData.site_name, "INFO", "✏️ Site configuration updated");
    } else {
        // Add new
        sites.push({ ...siteData, created_at: new Date() });
        addLog(siteData.id, siteData.site_name, "INFO", "➕ New site registered for monitoring");
    }
    console.log(`[registerSiteForMonitoring] Site stored with domain: ${sites.find(s => s.id === siteData.id)?.domain}`);
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
    await monitoringSweep();
}

export function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('[Monitoring] Service stopped');
        addLog('system', 'System', 'INFO', '⏸️ Monitoring service stopped');
    }
}

export { sites };
