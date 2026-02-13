import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { AppDataSource } from "./config/database.js";
import { BillingService } from "./services/billing.service.js";
import { SiteController } from "./controllers/site.controller.simple.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AdminController } from "./controllers/admin.controller.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { requireAdmin } from "./middleware/admin.middleware.js";
import { SeedService } from "./services/seed.service.js";
import { startMonitoring } from "./controllers/monitoring.scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security: Validate JWT_SECRET in production
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.error("❌ FATAL: JWT_SECRET is required in production");
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Static file serving from public directory
const publicDir = path.join(__dirname, "..", "public");
console.log(`[STATIC] Serving static files from: ${publicDir}`);

// Verify public directory exists
if (!fs.existsSync(publicDir)) {
    console.error(`❌ FATAL: Public directory not found at ${publicDir}`);
    process.exit(1);
}

app.use(express.static(publicDir));

// Root route redirects to login
app.get("/", (req: Request, res: Response) => {
    res.redirect("/login.html");
});

// Enhanced health check endpoint
app.get("/health", (req: Request, res: Response) => {
    const dbStatus = AppDataSource.isInitialized ? "connected" : "disconnected";
    const isHealthy = AppDataSource.isInitialized;

    const healthResponse = {
        status: isHealthy ? "ok" : "error",
        service: "Keepy Backend",
        database: dbStatus,
        timestamp: new Date().toISOString()
    };

    res.status(isHealthy ? 200 : 503).json(healthResponse);
});

// Auth Routes (Public)
app.post("/auth/register", AuthController.register);
app.post("/auth/login", AuthController.login);
app.get("/auth/me", requireAuth, AuthController.getCurrentUser);
app.patch("/auth/profile", requireAuth, AuthController.updateProfile);

// Admin Routes (Admin only)
app.get("/admin/users", requireAuth, requireAdmin, AdminController.getAllUsers);
app.get("/admin/users/:userId", requireAuth, requireAdmin, AdminController.getUserDetails);
app.get("/admin/stats", requireAuth, requireAdmin, AdminController.getStats);
app.patch("/admin/users/:userId", requireAuth, requireAdmin, AdminController.updateUser);

// Site Routes (Protected)
app.post("/sites", requireAuth, SiteController.registerSite);
app.post("/sites/register-db", requireAuth, SiteController.registerDB);
app.patch("/sites/:id", requireAuth, SiteController.updateSite);
app.get("/sites", requireAuth, SiteController.getAllSites);
app.get("/monitoring/logs", requireAuth, SiteController.getMonitoringLogs);
app.post("/monitoring/scan", requireAuth, SiteController.manualScan);

// Spam Logs v1.5
app.get("/api/spam-logs", requireAuth, SiteController.getSpamLogs);
app.post("/api/spam-logs/:logId/delete", requireAuth, SiteController.deleteSpamPost);

// Billing
app.get("/billing/estimate", (req: Request, res: Response) => {
    const interval = parseInt(req.query.interval as string);
    if (!interval || interval < 1 || interval > 10) {
        return res.status(400).json({ error: "Interval must be between 1 and 10" });
    }
    const price = BillingService.getMonthlyPrice(interval);
    res.json({ interval, monthly_fee: price, currency: "KRW" });
});

// PORT: Render auto-injects PORT, so we use process.env.PORT with fallback
const PORT = process.env.PORT || 3000;

// Production safety warning
if (process.env.NODE_ENV === "production" && process.env.DB_SYNC === "true") {
    console.warn("⚠️  DB_SYNC ENABLED IN PRODUCTION (Pilot Mode)");
    console.warn("   This is acceptable for initial deployment but should be disabled after stabilization");
}

// Database initialization with proper error handling
AppDataSource.initialize()
    .then(async () => {
        console.log("✅ Database connected successfully");
        console.log(`   - Type: PostgreSQL`);
        console.log(`   - Synchronize: ${process.env.DB_SYNC === "true" ? "ENABLED (⚠️ Pilot mode)" : "DISABLED"}`);
        console.log(`   - SSL: ${process.env.NODE_ENV === "production" ? "ENABLED" : "DISABLED"}`);

        // Seed admin account if needed
        await SeedService.seedAdminIfNeeded();

        // Start monitoring scheduler
        startMonitoring();
    })
    .catch((error) => {
        console.error("❌ Database connection failed:", error.message);
        console.error("   Please check DATABASE_URL or DB_* environment variables");
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`🚀 Keepy server running on port ${PORT}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   - Health check: http://localhost:${PORT}/health`);
});
