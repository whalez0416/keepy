import "reflect-metadata";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";
import { User } from "../models/User.js";

async function checkMinhospitalUser() {
    try {
        await AppDataSource.initialize();
        console.log("✅ Database connected");

        const siteRepo = AppDataSource.getRepository(Site);
        const userRepo = AppDataSource.getRepository(User);

        // Find minhospital site
        const site = await siteRepo.findOne({
            where: { domain: "minhospital.co.kr" },
            relations: ["user"]
        });

        if (!site) {
            console.log("❌ minhospital.co.kr site not found");
            process.exit(0);
        }

        console.log("\n📊 민병원 사이트 정보:");
        console.log(`- Site Name: ${site.site_name}`);
        console.log(`- Domain: ${site.domain}`);
        console.log(`- Is Active: ${site.is_active}`);
        console.log(`- User Email: ${site.user.email}`);
        console.log(`- User Role: ${site.user.role}`);
        console.log(`- Can Delete Spam: ${site.can_user_delete_spam}`);

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

checkMinhospitalUser();
