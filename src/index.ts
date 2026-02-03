import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { AppDataSource } from "./config/database.js";
import { BillingService } from "./services/billing.service.js";
import { SiteController } from "./controllers/site.controller.simple.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AdminController } from "./controllers/admin.controller.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { requireAdmin } from "./middleware/admin.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Main Routes
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "Keepy Backend" });
});

// Auth Routes (Public)
app.post("/auth/register", AuthController.register);
app.post("/auth/login", AuthController.login);
app.get("/auth/me", requireAuth, AuthController.getCurrentUser);
app.patch("/auth/profile", requireAuth, AuthController.updateProfile);

// Login Page (Public)
app.get("/login.html", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "login.html"));
});

// Dashboard (Public for now, will add auth check in frontend)
app.get("/dashboard", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "dashboard.html"));
});

// Admin Routes (Admin only - Security handled in admin.html and API endpoints)
app.get("/admin", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "admin.html"));
});
app.get("/admin/users", requireAuth, requireAdmin, AdminController.getAllUsers);
app.get("/admin/users/:userId", requireAuth, requireAdmin, AdminController.getUserDetails);
app.get("/admin/stats", requireAuth, requireAdmin, AdminController.getStats);
app.patch("/admin/users/:userId", requireAuth, requireAdmin, AdminController.updateUser);

// Site Routes (Protected)
app.post("/sites", requireAuth, SiteController.registerSite);
app.post("/sites/register-db", requireAuth, SiteController.registerDB);
app.get("/sites", requireAuth, SiteController.getAllSites);
app.get("/monitoring/logs", requireAuth, SiteController.getMonitoringLogs);
app.post("/monitoring/scan", requireAuth, SiteController.manualScan);


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
