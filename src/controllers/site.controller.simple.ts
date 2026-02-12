import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { MonitorService } from "../services/monitor.service.js";
import { startMonitoring, monitoringLogs, triggerManualScan, registerSiteForMonitoring } from "./monitoring.scheduler.js";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";
import { MonitoringLog, MonitoringEventType } from "../models/MonitoringLog.js";
import axios from "axios";

export class SiteController {
    static async registerSite(req: AuthRequest, res: Response) {
        const { site_name, target_url, interval } = req.body;
        const siteRepo = AppDataSource.getRepository(Site);

        try {
            const site = siteRepo.create({
                site_name,
                target_url,
                monitoring_interval: interval || 5,
                is_active: false,
                current_status: "unknown",
                user: req.user // Associate with authenticated user
            });

            await siteRepo.save(site);
            res.status(201).json(site);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async registerDB(req: AuthRequest, res: Response) {
        const { host, user, pass, name, domain } = req.body;
        const siteRepo = AppDataSource.getRepository(Site);

        try {
            console.log(`[registerDB] Received request for domain: ${domain}`);

            // Find existing site by domain or target_url for this user
            // We use query builder or findOne with simple conditions (assuming domain is unique per user or strict match)
            let site = await siteRepo.findOne({
                where: {
                    user: { id: req.user.id },
                    target_url: `https://${domain}` // Simple assumption, might need more robust matching
                }
            });

            if (!site) {
                // Create new if not exists
                site = siteRepo.create({
                    site_name: domain.split('.')[0] + " Hospital",
                    target_url: `https://${domain}`,
                    monitoring_interval: 5,
                    is_active: true,
                    current_status: "connected",
                    user: req.user,
                    domain: domain,
                    db_host: host,
                    db_user: user,
                    db_pass: pass,
                    db_name: name
                });

                await siteRepo.save(site);

                // Start monitoring service if not running (it checks DB now)
                startMonitoring();
            } else {
                // Update existing
                site.domain = domain;
                site.db_host = host;
                site.db_user = user;
                site.db_pass = pass;
                site.db_name = name;
                site.current_status = "connected";
                site.is_active = true;

                await siteRepo.save(site);
            }

            // Perform immediate health check
            const monitorService = new MonitorService();
            const health = await monitorService.checkHealth(site.target_url);
            site.current_status = health.success ? "healthy" : "error";
            site.last_checked_at = new Date();
            await siteRepo.save(site);

            // Notify scheduler (mostly for logging now)
            console.log(`[registerDB] Calling registerSiteForMonitoring with domain: ${domain}`);
            registerSiteForMonitoring({
                id: site.id,
                site_name: site.site_name,
                domain: domain
            });

            res.status(200).json({
                status: "success",
                message: "Database credentials updated and monitoring started",
                current_status: site.current_status,
                site_id: site.id
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAllSites(req: AuthRequest, res: Response) {
        try {
            const siteRepo = AppDataSource.getRepository(Site);
            // Filter sites by authenticated user
            const userSites = await siteRepo.find({
                where: { user: { id: req.user.id } },
                order: { created_at: "DESC" }
            });
            res.json(userSites);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async manualScan(req: Request, res: Response) {
        try {
            await triggerManualScan();
            res.json({ status: "success", message: "Manual scan completed" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getMonitoringLogs(req: AuthRequest, res: Response) {
        try {
            const siteRepo = AppDataSource.getRepository(Site);
            // Get user's site IDs
            const userSites = await siteRepo.find({
                where: { user: { id: req.user.id } },
                select: ["id"]
            });

            const userSiteIds = userSites.map(s => s.id);

            // Filter logs by user's sites (Logs are still in-memory)
            const userLogs = monitoringLogs.filter(log => userSiteIds.includes(log.site_id));
            const recentLogs = userLogs.slice(-50).reverse();

            res.json(recentLogs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSite(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { monitoring_interval, specific_board_table } = req.body;

            const siteRepo = AppDataSource.getRepository(Site);
            const site = await siteRepo.findOne({
                where: { id: id as string, user: { id: req.user.id } }
            });

            if (!site) {
                return res.status(404).json({ error: "Site not found" });
            }

            if (monitoring_interval) site.monitoring_interval = monitoring_interval;
            if (specific_board_table !== undefined) site.specific_board_table = specific_board_table;

            await siteRepo.save(site);

            // Re-register for monitoring with updated config
            registerSiteForMonitoring({
                id: site.id,
                site_name: site.site_name,
                domain: site.domain || '',
                specific_board_table: site.specific_board_table
            });

            res.json({ status: "success", site });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getSpamLogs(req: AuthRequest, res: Response) {
        try {
            const { site_id, days = 7 } = req.query;
            const logRepo = AppDataSource.getRepository(MonitoringLog);
            const siteRepo = AppDataSource.getRepository(Site);

            const isAdmin = req.user.role === 'admin';
            const queryBuilder = logRepo.createQueryBuilder("log")
                .leftJoinAndSelect("log.site", "site")
                .where("log.event_type = :eventType", { eventType: MonitoringEventType.SPAM_DETECTED })
                .andWhere("log.created_at >= :since", { since: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) });

            if (site_id) {
                queryBuilder.andWhere("site.id = :siteId", { siteId: site_id });
            }

            if (!isAdmin) {
                // Regular users only see their own sites
                queryBuilder.andWhere("site.userId = :userId", { userId: req.user.id });
            }

            const logs = await queryBuilder.orderBy("log.created_at", "DESC").limit(100).getMany();

            // Masking Logic (View-layer only)
            const maskedLogs = logs.map(log => {
                let subject = log.meta?.subject || log.message;
                // Mask phone numbers (e.g., 010-1234-5678 -> 010-****-5678) 
                // and emails (e.g., abc@def.com -> a**@def.com)
                if (typeof subject === 'string') {
                    subject = subject
                        .replace(/(\d{2,3})-(\d{3,4})-(\d{4})/g, '$1-****-$3')
                        .replace(/([a-zA-Z0-9._%+-])[^@]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***$2');
                }

                return {
                    log_id: log.id,
                    site_id: log.site.id,
                    site_name: log.site.site_name,
                    domain: log.site.domain,
                    target_board_table: log.site.target_board_table,
                    post_id: log.meta?.post_id,
                    subject: subject,
                    reasons: log.meta?.reasons,
                    score: log.meta?.score,
                    status: log.status,
                    detected_at: log.created_at,
                    can_user_delete_spam: log.site.can_user_delete_spam,
                    meta: log.meta // Optionally filter meta if it contains PII
                };
            });

            res.json({ items: maskedLogs });
        } catch (error: any) {
            console.error('[SiteController] getSpamLogs error:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteSpamPost(req: AuthRequest, res: Response) {
        try {
            const { logId } = req.params;
            const logRepo = AppDataSource.getRepository(MonitoringLog);

            const log = await logRepo.findOne({
                where: { id: logId as string },
                relations: ["site", "site.user"]
            });

            if (!log) return res.status(404).json({ error: "Log not found" });
            if (log.status === "deleted") return res.status(409).json({ error: "alreadyDeleted", status: "deleted" });

            const site = log.site;

            // v1.5.1: Granular Authority Policy
            const isAdmin = req.user.role === 'admin';
            const isOwner = req.user.id === site.user?.id;
            const hasPermission = site.can_user_delete_spam === true;

            if (!isAdmin && !(isOwner && hasPermission)) {
                return res.status(403).json({ error: "NO_DELETE_PERMISSION" });
            }

            const postId = log.meta?.post_id;
            const table = site.target_board_table;

            if (!postId || !table) {
                return res.status(400).json({ error: "Missing metadata for deletion" });
            }

            // Bridge Call
            const bridgeUrl = `https://${site.domain}/keepy_bridge.php`;
            const apiKey = "keepy_secret_2024";

            try {
                const response = await axios.post(bridgeUrl, {
                    action: 'delete_post',
                    table: table,
                    post_id: postId
                }, {
                    headers: { 'X-API-KEY': apiKey },
                    timeout: 10000
                });

                if (response.data.success) {
                    log.status = "deleted";
                    log.meta = {
                        ...log.meta,
                        actedBy: req.user.name,
                        actedAt: new Date().toISOString()
                    };
                    await logRepo.save(log);
                    return res.json({ success: true, status: "deleted" });
                } else {
                    // Standardized Error Codes
                    const bridgeError = response.data.error;
                    let errorCode = "BRIDGE_ERROR";
                    if (bridgeError === "NOT_FOUND") errorCode = "NOT_FOUND";
                    if (bridgeError === "FORBIDDEN_TABLE") errorCode = "FORBIDDEN_TABLE";

                    log.status = "delete_failed";
                    log.message = `Delete failed: ${errorCode}`;
                    await logRepo.save(log);

                    return res.status(500).json({ error: errorCode, bridge_trace: response.data.trace });
                }
            } catch (error: any) {
                console.error('[SiteController] Bridge delete error:', error.message);
                log.status = "delete_failed";
                log.message = "Delete failed: BRIDGE_ERROR";
                await logRepo.save(log);
                return res.status(500).json({ error: "BRIDGE_ERROR" });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

