export declare class MonitorService {
    /**
     * Performs a health check on the target URL.
     */
    checkHealth(url: string): Promise<{
        status: number;
        success: boolean;
        error?: string;
    }>;
    /**
     * Triggers self-healing via SSH or local agent.
     */
    triggerSelfHealing(siteConfig: any): Promise<boolean>;
}
//# sourceMappingURL=monitor.service.d.ts.map