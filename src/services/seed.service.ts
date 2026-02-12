import { AppDataSource } from "../config/database.js";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";

export class SeedService {
    static async seedAdminIfNeeded(): Promise<void> {
        try {
            const userRepo = AppDataSource.getRepository(User);

            // Check if any admin exists
            const adminExists = await userRepo.findOne({
                where: { role: "admin" }
            });

            if (!adminExists) {
                // Create default admin account
                const hashedPassword = await bcrypt.hash("tempAdmin123!", 10);

                const admin = new User();
                admin.email = "admin@keepy.com";
                admin.password_hash = hashedPassword;
                admin.name = "Admin";
                admin.role = "admin";
                admin.system_role = "superadmin"; // SuperAdmin for full system access

                await userRepo.save(admin);
                console.log("[SEED] Admin account created (email: admin@keepy.com, password: tempAdmin123!)");
                console.log("[SEED] ⚠️  Please change the default password immediately");
                console.log("[SEED] System role: superadmin (full access to all sites)");
            }
        } catch (error: any) {
            console.error("[SEED] Failed to seed admin:", error.message);
        }
    }
}
