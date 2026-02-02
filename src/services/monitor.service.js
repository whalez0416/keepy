"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorService = void 0;
const axios_1 = __importDefault(require("axios"));
class MonitorService {
    /**
     * Performs a health check on the target URL.
     */
    async checkHealth(url) {
        try {
            const start = Date.now();
            const response = await axios_1.default.get(url, { timeout: 5000 });
            const duration = Date.now() - start;
            return {
                status: response.status,
                success: response.status >= 200 && response.status < 300
            };
        }
        catch (error) {
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
    async triggerSelfHealing(siteConfig) {
        console.log(`[Self-Healing] Detected failure at ${siteConfig.target_url}. Triggering restart...`);
        // In real world: Execute SSH command via 'ssh2' library
        // ssh.exec(siteConfig.healing_command)
        console.log(`[Self-Healing] Restart command sent: ${siteConfig.healing_command}`);
        return true;
    }
}
exports.MonitorService = MonitorService;
//# sourceMappingURL=monitor.service.js.map