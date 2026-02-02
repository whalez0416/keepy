import { Queue, Worker, Job } from 'bullmq';
import { MonitorService } from './monitor.service.js';
import { SpamHunterService } from './spam-hunter.service.js';

const monitorService = new MonitorService();
const spamHunterService = new SpamHunterService();

// Redis connection config (normally from .env)
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const monitoringQueue = new Queue('monitoring', { connection });
export const spamQueue = new Queue('spam-cleaner', { connection });

// Worker for Monitoring
const monitorWorker = new Worker('monitoring', async (job: Job) => {
    const { site } = job.data;
    console.log(`[Worker] Checking site: ${site.target_url}`);
    const result = await monitorService.checkHealth(site.target_url);

    if (!result.success && site.self_healing_enabled) {
        await monitorService.triggerSelfHealing(site);
    }
    // Update DB status logic here...
}, { connection });

// Worker for Spam Cleaning
const spamWorker = new Worker('spam-cleaner', async (job: Job) => {
    const { site } = job.data;
    await spamHunterService.cleanSpam(site);
}, { connection });

console.log('Workers started successfully');
