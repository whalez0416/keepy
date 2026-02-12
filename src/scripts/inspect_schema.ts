import axios from "axios";

async function inspectSchema() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";

    try {
        console.log("🔍 Inspecting md_board schema...");
        const response = await axios.post(bridgeUrl, {
            action: 'debug_spam_check',
            table: 'md_board',
            post_id: 1 // Just to trigger the schema/columns dump
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (response.data.success) {
            console.log("\nColumns:", response.data.columns);
            console.log("\nRaw Data Sample:", response.data.raw_data);
        } else {
            console.error("❌ Debug failed:", response.data.error);
        }
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

inspectSchema();
