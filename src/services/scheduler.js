"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spamQueue = exports.monitoringQueue = void 0;
const bullmq_1 = require("bullmq");
const monitor_service_1 = require("./services/monitor.service");
const spam_hunter_service_1 = require("./services/spam-hunter.service");
const monitorService = new monitor_service_1.MonitorService();
const spamHunterService = new spam_hunter_service_1.SpamHunterService();
// Redis connection config (normally from .env)
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
exports.monitoringQueue = new bullmq_1.Queue('monitoring', { connection });
exports.spamQueue = new bullmq_1.Queue('spam-cleaner', { connection });
// Worker for Monitoring
const monitorWorker = new bullmq_1.Worker('monitoring', async (job) => {
    const { site } = job.data;
    console.log(`[Worker] Checking site: ${site.target_url}`);
    const result = await monitorService.checkHealth(site.target_url);
    if (!result.success && site.self_healing_enabled) {
        await monitorService.triggerSelfHealing(site);
    }
    // Update DB status logic here...
}, { connection });
// Worker for Spam Cleaning
const spamWorker = new bullmq_1.Worker('spam-cleaner', async (job) => {
    const { site } = job.data;
    await spamHunterService.cleanSpam(site);
}, { connection });
console.log('Workers started successfully');
//# sourceMappingURL=scheduler.js.map