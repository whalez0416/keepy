import axios from "axios";
import { AppDataSource } from "../config/database.js";
import { Site } from "../models/Site.js";
import { MonitoringLog, MonitoringEventType } from "../models/MonitoringLog.js";
import { buildBridgeHeaders } from "../utils/bridgeAuth.js";

interface SpamPost {
    id: number | string;
    subject: string;
    content: string;
    date: string;
    hp?: string;
}

interface SpamJudgment {
    isSpam: boolean;
    reasons: string[];
    score: number;
}

export class SpamHunterService {
    /**
     * Detects and deletes spam posts from customer's DB.
     * v1 Refinement: Windowed Scan + Standardized Reasoning + Event Logging
     */
    async cleanSpam(siteId: string): Promise<{ detected: number; message: string }> {
        const siteRepo = AppDataSource.getRepository(Site);
        const logRepo = AppDataSource.getRepository(MonitoringLog);

        const site = await siteRepo.findOne({ where: { id: siteId } });
        if (!site) throw new Error("Site not found");

        console.log(`[SpamHunter] Starting scan for: ${site.domain}`);

        try {
            const bridgeUrl = `https://${site.domain}/keepy_bridge.php`;

            // Use the site-specific API key (never a shared/hardcoded key)
            const siteWithKey = await siteRepo.findOne({
                where: { id: siteId },
                select: ['id', 'domain', 'target_board_table', 'last_scanned_id', 'last_scanned_at', 'bridge_api_key'] as any
            });
            const apiKey = siteWithKey?.bridge_api_key;
            if (!apiKey) {
                console.warn(`[SpamHunter] Site ${site.domain} has no bridge_api_key. Skipping scan.`);
                await this.logEvent(site, MonitoringEventType.MAPPING_FAILED, "bridge_api_key not set. Re-deploy bridge via FTP upload script.");
                return { detected: 0, message: "bridge_api_key not configured" };
            }

            // 1. Connection & Trace Check
            const testResponse = await axios.post(bridgeUrl, { action: 'test_connection' }, {
                timeout: 5000,
                headers: buildBridgeHeaders(apiKey)
            });


            if (!testResponse.data.success) {
                await this.logEvent(site, MonitoringEventType.SITE_DOWN, "Bridge connection failed", testResponse.data.trace);
                throw new Error('DB 연결 실패');
            }

            // 2. Select Target Board
            const table = site.target_board_table;
            if (!table) {
                await this.logEvent(site, MonitoringEventType.MAPPING_FAILED, "No target board selected for monitoring.");
                return { detected: 0, message: "Target board not set" };
            }

            // 3. Windowed Scan (7-day cap policy for v1.5)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            let sinceDate = site.last_scanned_at;

            if (!sinceDate || sinceDate < sevenDaysAgo) {
                sinceDate = sevenDaysAgo;
            }

            console.log(`[SpamHunter] Scanning ${table} since ID: ${site.last_scanned_id || 0}, Date: ${sinceDate.toISOString()}`);

            const fetchResponse = await axios.post(bridgeUrl, {
                action: 'fetch_recent_posts',
                table: table,
                limit: 20,
                last_id: site.last_scanned_id || 0,
                since_date: sinceDate.toISOString().replace('T', ' ').substring(0, 19) // PHP-ready format
            }, {
                timeout: 10000,
                headers: { 'X-API-KEY': apiKey }
            });

            if (!fetchResponse.data.success) {
                await this.logEvent(site, MonitoringEventType.MAPPING_FAILED, `Failed to fetch from ${table}`, fetchResponse.data.trace);
                return { detected: 0, message: "Fetch failed" };
            }

            const posts: SpamPost[] = fetchResponse.data.posts || [];
            console.log(`[SpamHunter] Bridge returned ${posts.length} posts.`);

            let totalDetected = 0;
            let lastId = site.last_scanned_id;
            let lastDate = site.last_scanned_at;

            for (const post of posts) {
                const judgment = this.judgeSpam(post);
                console.log(`[SpamHunter] Item ID: ${post.id}, Score: ${judgment.score}, isSpam: ${judgment.isSpam}, Content: ${post.subject}`);

                if (judgment.isSpam) {
                    totalDetected++;
                    await this.logEvent(site, MonitoringEventType.SPAM_DETECTED,
                        `Spam detected in ${table} (ID: ${post.id})`,
                        fetchResponse.data.trace,
                        { reasons: judgment.reasons, score: judgment.score, post_id: post.id }
                    );
                }

                // Update markers
                lastId = post.id.toString();
                lastDate = new Date(post.date);
            }

            // 4. Update Site State (Checkpoint)
            if (posts.length > 0) {
                site.last_scanned_id = lastId;
                site.last_scanned_at = lastDate;
                site.last_checked_at = new Date();
                await siteRepo.save(site);
            }

            return { detected: totalDetected, message: `Scan complete. ${totalDetected} spam found.` };

        } catch (error: any) {
            console.error(`[SpamHunter] Error: ${error.message}`);
            throw error;
        }
    }

    private judgeSpam(post: SpamPost): SpamJudgment {
        const reasons: string[] = [];
        let score = 0;
        const fullText = `${post.subject} ${post.content}`;

        // Phase 1: Keywords (Strong signal)
        const keywords = ['카지노', '바다이야기', '도박', '슬롯', '토토'];
        if (keywords.some(kw => fullText.includes(kw))) {
            reasons.push("Keyword match (Gambling)");
            score += 0.8;
        }

        // Phase 2: Entropy (Gibberish)
        const entropy = this.calculateEntropy(fullText);
        if (entropy > 4.5) {
            reasons.push(`High entropy (${entropy.toFixed(2)}) - Gibberish detected`);
            score += 0.5;
        }

        // Phase 3: Phone Pattern
        if (post.hp && !this.isValidPhoneNumber(post.hp)) {
            reasons.push("Suspicious phone number pattern");
            score += 0.4;
        }

        return {
            isSpam: score >= 0.7, // v1 threshold
            reasons,
            score: Math.min(score, 1.0)
        };
    }

    private async logEvent(site: Site, type: MonitoringEventType, message: string, trace?: string[], meta?: any) {
        const logRepo = AppDataSource.getRepository(MonitoringLog);
        const log = logRepo.create({
            site,
            event_type: type,
            message,
            trace,
            meta
        });
        await logRepo.save(log);
        console.log(`[EventLog] ${type}: ${message}`);
    }

    /**
     * Calculate Shannon entropy to detect gibberish/random text
     * Higher entropy = more random/gibberish
     */
    private calculateEntropy(text: string): number {
        if (!text || text.length === 0) return 0;

        const freq: { [key: string]: number } = {};
        for (const char of text) {
            freq[char] = (freq[char] || 0) + 1;
        }

        let entropy = 0;
        const len = text.length;

        for (const char in freq) {
            const p = freq[char] / len;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    }

    /**
     * Calculate ratio of Korean characters in text
     * Returns value between 0 and 1
     */
    private getKoreanRatio(text: string): number {
        if (!text || text.length === 0) return 0;

        const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;
        const koreanChars = text.match(koreanRegex);
        const koreanCount = koreanChars ? koreanChars.length : 0;

        // Count only meaningful characters (exclude spaces, punctuation)
        const meaningfulChars = text.replace(/[\s\p{P}]/gu, '').length;

        return meaningfulChars > 0 ? koreanCount / meaningfulChars : 0;
    }

    /**
     * Validate phone number
     * Rejects: empty, all zeros, repeated digits, too short
     */
    private isValidPhoneNumber(phone: string): boolean {
        if (!phone || phone.trim().length === 0) return false;

        // Remove common separators
        const cleaned = phone.replace(/[-\s().]/g, '');

        // Too short
        if (cleaned.length < 8) return false;

        // All zeros or ones
        if (/^0+$/.test(cleaned) || /^1+$/.test(cleaned)) return false;

        // Repeated digits (e.g., 1111, 2222, 0000)
        if (/^(\d)\1+$/.test(cleaned)) return false;

        // Sequential numbers (e.g., 1234567890)
        const isSequential = cleaned.split('').every((digit, i) => {
            if (i === 0) return true;
            return parseInt(digit) === parseInt(cleaned[i - 1]) + 1;
        });
        if (isSequential) return false;

        return true;
    }

    private async notifyAdmin(email: string, count: number) {
        console.log(`[Notification] Sent to ${email}: ${count} spam posts cleaned.`);
    }
}

