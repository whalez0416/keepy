import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDataSource } from '../config/database.js';
import { Site } from '../models/Site.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BridgeManagerService {
    /**
     * Deploys the bridge file to a remote site via SFTP.
     */
    async deployBridge(siteId: string): Promise<{ success: boolean; message: string }> {
        const siteRepo = AppDataSource.getRepository(Site);
        const site = await siteRepo.findOne({
            where: { id: siteId },
            select: ["id", "sftp_host", "sftp_user", "sftp_pass", "site_type", "domain", "remote_path"]
        });

        if (!site || !site.sftp_host || !site.sftp_user || !site.sftp_pass) {
            throw new Error("SFTP configuration missing for this site.");
        }

        const sftp = new Client();
        const bridgePath = path.resolve(__dirname, '../../keepy_bridge.php');

        try {
            console.log(`[BridgeManager] Connecting to ${site.sftp_host}...`);
            await sftp.connect({
                host: site.sftp_host,
                port: 22,
                username: site.sftp_user,
                password: site.sftp_pass
            });

            const remoteBridgePath = path.posix.join(site.remote_path || '.', 'keepy_bridge.php');
            console.log(`[BridgeManager] Uploading bridge to ${site.domain} at ${remoteBridgePath}...`);
            await sftp.put(bridgePath, remoteBridgePath);

            await sftp.end();

            // Verify version after upload
            const versionInfo = await this.checkBridgeVersion(`https://${site.domain}/keepy_bridge.php`);

            site.bridge_version = versionInfo.version;
            await siteRepo.save(site);

            return { success: true, message: `Bridge v${versionInfo.version} deployed successfully.` };
        } catch (error: any) {
            console.error(`[BridgeManager] Deployment failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Checks the version of a remote bridge.
     */
    async checkBridgeVersion(url: string): Promise<{ version: string; status: string }> {
        try {
            const response = await axios.get(url, { timeout: 5000 });
            if (response.data && response.data.version) {
                return { version: response.data.version, status: 'ok' };
            }
            return { version: 'unknown', status: 'invalid_response' };
        } catch (error: any) {
            return { version: 'none', status: 'not_found' };
        }
    }
}
