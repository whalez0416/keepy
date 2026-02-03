import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { MonitorService } from "../services/monitor.service.js";
import { sites, startMonitoring, monitoringLogs, triggerManualScan, registerSiteForMonitoring } from "./monitoring.scheduler.js";

export class SiteController {
    static async registerSite(req: AuthRequest, res: Response) {
        const { site_name, target_url, interval } = req.body;

        const site = {
            id: Math.random().toString(36).substring(7),
            site_name,
            target_url,
            monitoring_interval: interval || 5,
            is_active: false,
            current_status: "unknown",
            user_id: req.user.id, // Associate with authenticated user
            created_at: new Date()
        };

        sites.push(site);
        res.status(201).json(site);
    }

    static async registerDB(req: AuthRequest, res: Response) {
        const { host, user, pass, name, domain } = req.body;

        try {
            console.log(`[registerDB] Received request for domain: ${domain}`);
            let site = sites.find(s => s.target_url.includes(domain) && s.user_id === req.user.id);

            if (!site) {
                site = {
                    id: Math.random().toString(36).substring(7),
                    site_name: domain.split('.')[0] + " Hospital",
                    target_url: `https://${domain}`,
                    monitoring_interval: 5,
                    is_active: true,
                    current_status: "connected",
                    user_id: req.user.id, // Associate with authenticated user
                    domain: domain,
                    db_host: host,
                    db_user: user,
                    db_pass: pass,
                    db_name: name,
                    created_at: new Date()
                };
                sites.push(site);

                // Start monitoring when first site is registered
                startMonitoring();
            } else {
                site.domain = domain;
                site.db_host = host;
                site.db_user = user;
                site.db_pass = pass;
                site.db_name = name;
                site.current_status = "connected";
                site.is_active = true;
            }

            const monitorService = new MonitorService();
            const health = await monitorService.checkHealth(site.target_url);
            site.current_status = health.success ? "healthy" : "error";
            site.last_checked_at = new Date();

            // ⭐ Register to monitoring scheduler with domain
            console.log(`[registerDB] Calling registerSiteForMonitoring with domain: ${domain}`);
            registerSiteForMonitoring({
                id: site.id,
                site_name: site.site_name,
                target_url: site.target_url,
                monitoring_interval: site.monitoring_interval,
                is_active: site.is_active,
                current_status: site.current_status,
                domain: domain,
                db_host: site.db_host,
                db_user: site.db_user,
                db_pass: site.db_pass,
                db_name: site.db_name
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
            // Filter sites by authenticated user
            const userSites = sites.filter(s => s.user_id === req.user.id);
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
            // Get user's site IDs
            const userSiteIds = sites.filter(s => s.user_id === req.user.id).map(s => s.id);

            // Filter logs by user's sites
            const userLogs = monitoringLogs.filter(log => userSiteIds.includes(log.site_id));
            const recentLogs = userLogs.slice(-50).reverse();

            res.json(recentLogs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
