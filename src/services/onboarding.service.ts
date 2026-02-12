import axios from "axios";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";

export class OnboardingService {
    /**
     * Step 1: Ping (Status Check)
     * Verifies bridge is reachable without exploring DB schema.
     */
    async checkPing(siteId: string): Promise<{ success: boolean; version: string }> {
        const siteRepo = AppDataSource.getRepository(Site);
        const site = await siteRepo.findOneBy({ id: siteId });
        if (!site) throw new Error("Site not found");

        const bridgeUrl = `https://${site.domain}/keepy_bridge.php`;
        try {
            const response = await axios.get(bridgeUrl, { timeout: 5000 });
            if (response.data.status === 'ok') {
                site.onboarding_level = 1;
                site.bridge_version = response.data.version;
                await siteRepo.save(site);
                return { success: true, version: response.data.version };
            }
            return { success: false, version: 'unknown' };
        } catch (error: any) {
            console.error(`[Onboarding] Ping failed for ${site.domain}: ${error.message}`);
            return { success: false, version: 'none' };
        }
    }

    /**
     * Step 2: List Boards (Discovery)
     * Fetches metadata for potential board tables.
     */
    async getBoardCandidates(siteId: string): Promise<any[]> {
        const siteRepo = AppDataSource.getRepository(Site);
        const site = await siteRepo.findOneBy({ id: siteId });
        if (!site) throw new Error("Site not found");

        const bridgeUrl = `https://${site.domain}/keepy_bridge.php`;
        const apiKey = "keepy_secret_2024";

        try {
            const response = await axios.post(bridgeUrl, { action: 'list_boards' }, {
                headers: { 'X-API-KEY': apiKey }
            });
            return response.data.boards || [];
        } catch (error: any) {
            console.error(`[Onboarding] Board discovery failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Step 3: Link Board & Set Active
     */
    async linkBoard(siteId: string, table: string): Promise<{ success: boolean }> {
        const siteRepo = AppDataSource.getRepository(Site);
        const site = await siteRepo.findOneBy({ id: siteId });
        if (!site) throw new Error("Site not found");

        site.target_board_table = table;
        site.onboarding_level = 3; // Jump to Active after linking
        site.is_active = true;
        await siteRepo.save(site);

        return { success: true };
    }
}
