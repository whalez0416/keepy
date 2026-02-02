import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import { AppDataSource } from "./config/database.js";
import { MonitorService } from "./services/monitor.service.js";
import { SpamHunterService } from "./services/spam-hunter.service.js";
import { BillingService } from "./services/billing.service.js";
import { SiteController } from "./controllers/site.controller.simple.js";

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Main Routes
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "Keepy Backend" });
});

app.post("/sites", SiteController.registerSite);
app.post("/sites/register-db", SiteController.registerDB);
app.get("/sites", SiteController.getAllSites);
app.get("/monitoring/logs", SiteController.getMonitoringLogs);
app.post("/monitoring/scan", SiteController.manualScan);

app.get("/billing/estimate", (req: Request, res: Response) => {
    const interval = parseInt(req.query.interval as string);
    if (!interval || interval < 1 || interval > 10) {
        return res.status(400).json({ error: "Interval must be between 1 and 10" });
    }
    const price = BillingService.getMonthlyPrice(interval);
    res.json({ interval, monthly_fee: price, currency: "KRW" });
});

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
    .then(() => {
        console.log("Database connected successfully");
    })
    .catch((error) => console.log("Database connection failed (Check if Postgres is running)", error.message));

app.listen(PORT, () => {
    console.log(`Keepy server running on http://localhost:${PORT}`);
});
