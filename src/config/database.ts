import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { User } from "../models/User.js";
import { Site } from "../models/Site.js";
import { MonitoringLog } from "../models/MonitoringLog.js";
import { SiteMember } from "../models/SiteMember.js";
import { SupportTicket } from "../models/SupportTicket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Support DATABASE_URL (Render/Neon/Supabase standard) or individual env vars
const databaseUrl = process.env.DATABASE_URL;

const connectionConfig = databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
        database: process.env.DB_NAME || "keepy",
    };

export const AppDataSource = new DataSource({
    type: "postgres",
    ...connectionConfig,
    // SSL for production (required for Neon/Supabase/managed Postgres)
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    // DISABLED: Use migrations instead of synchronize
    synchronize: false,
    logging: process.env.NODE_ENV !== "production",
    entities: [User, Site, MonitoringLog, SiteMember, SupportTicket],
    migrations: ["dist/migrations/**/*.js"],
    subscribers: [],
});
