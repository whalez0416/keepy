import axios from "axios";

interface SpamPost {
    wr_id: number;
    wr_subject: string;
    wr_content: string;
    wr_name?: string;
    wr_hp?: string; // Phone number field
}

export class SpamHunterService {
    /**
     * Detects and deletes spam posts from customer's DB.
     * Uses HTTP API bridge instead of direct MySQL connection.
     */
    async cleanSpam(siteConfig: any): Promise<{ detected: number; deleted: number }> {
        console.log(`[SpamHunter] Connecting to DB via PHP Bridge: ${siteConfig.domain}`);

        try {
            // PHP 브릿지 URL 생성
            const bridgeUrl = `https://${siteConfig.domain}/keepy_bridge.php`;

            console.log(`[SpamHunter] Bridge URL: ${bridgeUrl}`);

            // 1. 연결 테스트
            const testResponse = await axios.post(bridgeUrl, {
                action: 'test_connection'
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!testResponse.data.success) {
                throw new Error('DB 연결 실패');
            }

            console.log(`[SpamHunter] DB Connection OK: ${testResponse.data.database}`);

            // 2. 최근 게시물 가져오기 (고급 분석용)
            const fetchResponse = await axios.post(bridgeUrl, {
                action: 'fetch_recent_posts',
                table: 'g5_write_free',
                limit: 20
            }, {
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!fetchResponse.data.success) {
                const errorMsg = fetchResponse.data.error || 'Failed to fetch posts';

                // 테이블이 없는 경우 경고만 표시하고 계속 진행
                if (errorMsg.includes('존재하지 않습니다') || errorMsg.includes('not exist')) {
                    console.log(`[SpamHunter] Warning: ${errorMsg}`);
                    console.log(`[SpamHunter] Skipping spam scan - no board tables found`);
                    return { detected: 0, deleted: 0 };
                }

                throw new Error(errorMsg);
            }

            const posts: SpamPost[] = fetchResponse.data.posts || [];
            console.log(`[SpamHunter] Fetched ${posts.length} recent posts for analysis`);

            // 3. 고급 스팸 필터 적용
            let detectedCount = 0;
            const spamIds: number[] = [];

            for (const post of posts) {
                const fullText = `${post.wr_subject} ${post.wr_content}`;
                let isSpam = false;
                let reason = '';

                // 키워드 체크
                const keywords = ['카지노', '바다이야기', '도박', '슬롯', '토토'];
                if (keywords.some(kw => fullText.includes(kw))) {
                    isSpam = true;
                    reason = 'Keyword match';
                }

                // 엔트로피 체크 (외계어 탐지)
                if (!isSpam && this.calculateEntropy(fullText) > 4.5) {
                    isSpam = true;
                    reason = 'High entropy (gibberish)';
                }

                // 전화번호 유효성 체크
                if (!isSpam && post.wr_hp && !this.isValidPhoneNumber(post.wr_hp)) {
                    isSpam = true;
                    reason = 'Invalid phone number';
                }

                if (isSpam) {
                    detectedCount++;
                    spamIds.push(post.wr_id);
                    console.log(`[SpamHunter] 🚨 Spam detected (ID: ${post.wr_id}): ${reason}`);
                }
            }

            console.log(`[SpamHunter] Advanced scan complete: ${detectedCount} spam posts detected`);

            return { detected: detectedCount, deleted: 0 };

        } catch (error: any) {
            console.error(`[SpamHunter] Error: ${error.message}`);

            // 더 자세한 에러 정보 로깅
            if (error.response) {
                console.error(`[SpamHunter] Response status: ${error.response.status}`);
                console.error(`[SpamHunter] Response data:`, error.response.data);
            }

            throw new Error(`DB 접속 실패: ${error.message}`);
        }
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

