export declare class SpamHunterService {
    /**
     * Detects and deletes spam posts from customer's DB.
     * In a real implementation, this would connect to the target DB using the provided credentials.
     */
    cleanSpam(siteConfig: any): Promise<{
        detected: number;
        deleted: number;
    }>;
    private notifyAdmin;
}
//# sourceMappingURL=spam-hunter.service.d.ts.map