import { createHmac } from "crypto";

/**
 * Generates HMAC-SHA256 signed headers for Keepy Bridge requests.
 *
 * Signature formula: HMAC-SHA256( apiKey + timestamp, apiKey )
 * This matches the PHP validation logic in keepy_bridge.php v2.0.
 *
 * Replay attack prevention: the PHP side rejects requests where the
 * timestamp differs from server time by more than ±300 seconds.
 *
 * @param apiKey  Site-specific bridge API key (stored in sites.bridge_api_key)
 * @returns       Headers object ready to pass to axios / fetch
 */
export function buildBridgeHeaders(apiKey: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", apiKey)
        .update(apiKey + timestamp)
        .digest("hex");

    return {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signature,
    };
}
