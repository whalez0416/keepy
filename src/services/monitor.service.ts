import axios from "axios";

export class MonitorService {
    /**
     * Performs a health check on the target URL.
     */
    async checkHealth(url: string): Promise<{ status: number; success: boolean; error?: string }> {
        try {
            const start = Date.now();
            const response = await axios.get(url, { timeout: 5000 });
            const duration = Date.now() - start;

            return {
                status: response.status,
                success: response.status >= 200 && response.status < 300
            };
        } catch (error: any) {
            return {
                status: error.response?.status || 0,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Triggers self-healing via SSH or local agent.
     */
    async triggerSelfHealing(siteConfig: any): Promise<boolean> {
        console.log(`[Self-Healing] Detected failure at ${siteConfig.target_url}. Triggering restart...`);

        // In real world: Execute SSH command via 'ssh2' library
        // ssh.exec(siteConfig.healing_command)

        console.log(`[Self-Healing] Restart command sent: ${siteConfig.healing_command}`);
        return true;
    }
}
