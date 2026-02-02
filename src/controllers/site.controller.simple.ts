import { Request, Response } from "express";
import { MonitorService } from "../services/monitor.service.js";
import { sites, startMonitoring, monitoringLogs, triggerManualScan } from "./monitoring.scheduler.js";

export class SiteController {
    static async registerSite(req: Request, res: Response) {
        const { site_name, target_url, interval } = req.body;

        const site = {
            id: Math.random().toString(36).substring(7),
            site_name,
            target_url,
            monitoring_interval: interval || 5,
            is_active: false,
            current_status: "unknown",
            created_at: new Date()
        };

        sites.push(site);
        res.status(201).json(site);
    }

    static async registerDB(req: Request, res: Response) {
        const { host, user, pass, name, domain } = req.body;

        try {
            let site = sites.find(s => s.target_url.includes(domain));

            if (!site) {
                site = {
                    id: Math.random().toString(36).substring(7),
                    site_name: domain.split('.')[0] + " Hospital",
                    target_url: `https://${domain}`,
                    monitoring_interval: 5,
                    is_active: true,
                    current_status: "connected",
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

    static async getAllSites(req: Request, res: Response) {
        try {
            res.json(sites);
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

    static async getMonitoringLogs(req: Request, res: Response) {
        try {
            // Return last 50 logs
            const recentLogs = monitoringLogs.slice(-50).reverse();
            res.json(recentLogs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
