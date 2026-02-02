"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const database_1 = require("./config/database");
const monitor_service_1 = require("./services/monitor.service");
const spam_hunter_service_1 = require("./services/spam-hunter.service");
const billing_service_1 = require("./services/billing.service");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const monitorService = new monitor_service_1.MonitorService();
const spamHunterService = new spam_hunter_service_1.SpamHunterService();
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "Keepy Backend" });
});
// Mock endpoint to trigger all periodic tasks manually for testing
app.post("/tasks/run-all", async (req, res) => {
    console.log("[Scheduler] Manual trigger for all tasks...");
    // 1. Fetch all active sites
    // 2. Based on interval, check if it's time to monitor
    // 3. For all sites, run spam clean (1m cycle)
    res.json({ message: "Tasks triggered" });
});
// Billing Price Calculation API
app.get("/billing/estimate", (req, res) => {
    const interval = parseInt(req.query.interval);
    if (!interval || interval < 1 || interval > 10) {
        return res.status(400).json({ error: "Interval must be between 1 and 10" });
    }
    const price = billing_service_1.BillingService.getMonthlyPrice(interval);
    res.json({ interval, monthly_fee: price, currency: "KRW" });
});
const PORT = process.env.PORT || 3000;
database_1.AppDataSource.initialize()
    .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
        console.log(`Keepy server running on http://localhost:${PORT}`);
    });
})
    .catch((error) => console.log("Database connection failed", error));
//# sourceMappingURL=index.js.map