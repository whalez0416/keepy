import { Request, Response } from "express";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";
import { User } from "../models/User.js";
import { MonitorService } from "../services/monitor.service.js";

export class SiteController {
    static async registerSite(req: Request, res: Response) {
        const { site_name, target_url, interval, user_id } = req.body;

        try {
            const userRepo = AppDataSource.getRepository(User);
            const siteRepo = AppDataSource.getRepository(Site);

            const user = await userRepo.findOneBy({ id: user_id });
            if (!user) return res.status(404).json({ error: "User not found" });

            const site = siteRepo.create({
                site_name,
                target_url,
                monitoring_interval: interval,
                user
            });

            await siteRepo.save(site);
            res.status(201).json(site);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async registerDB(req: Request, res: Response) {
        const { host, user, pass, name, domain } = req.body;

        try {
            const siteRepo = AppDataSource.getRepository(Site);

            // Find site by domain (assuming target_url contains domain or use domain field)
            let site = await siteRepo.createQueryBuilder("site")
                .where("site.target_url LIKE :domain", { domain: `%${domain}%` })
                .getOne();

            if (!site) {
                // If site doesn't exist, create it (assign to default user if needed)
                // For now, let's just return error if not found in pre-registered sites
                return res.status(404).json({ error: "Site not registered in Keepy yet. Please register site first." });
            }

            site.db_host = host;
            site.db_user = user;
            site.db_pass = pass;
            site.db_name = name;
            site.current_status = "connected";
            site.is_active = true; // Activate monitoring

            await siteRepo.save(site);

            // Trigger immediate health check
            const monitor = new MonitorService();
            const health = await monitor.checkHealth(site.target_url);
            site.current_status = health.success ? "healthy" : "error";
            await siteRepo.save(site);

            res.status(200).json({
                status: "success",
                message: "Database credentials updated and monitoring started",
                current_status: site.current_status
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAllSites(req: Request, res: Response) {
        try {
            const siteRepo = AppDataSource.getRepository(Site);
            const sites = await siteRepo.find({ relations: ["user"] });
            res.json(sites);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
