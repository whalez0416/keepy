import axios from 'axios';

async function verifyBridgeAPI() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";

    console.log(`🚀 Testing Bridge API v1.1.1 at: ${bridgeUrl}`);

    try {
        // 1. Check Status (GET) - Step 1: Baseline (No DB)
        console.log("\n📡 Step 1 Action: status (GET)");
        const statusResponse = await axios.get(bridgeUrl);
        console.log("Status Response:", JSON.stringify(statusResponse.data, null, 2));

        if (statusResponse.data.status !== 'ok') {
            throw new Error("Bridge status is not OK");
        }

        // 2. List Boards (POST) - Step 2: Board Discovery (Context/Trace included)
        console.log("\n📡 Step 2 Action: list_boards (POST)");
        const listBoardsResponse = await axios.post(bridgeUrl, {
            action: 'list_boards'
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        console.log("Boards Found:", listBoardsResponse.data.boards?.length || 0);
        if (listBoardsResponse.data.boards && listBoardsResponse.data.boards.length > 0) {
            console.log("Sample Board Meta:", JSON.stringify(listBoardsResponse.data.boards[0], null, 2));
        }
        console.log("Trace Log:", JSON.stringify(listBoardsResponse.data.trace, null, 2));

        // 3. Fetch Posts (POST) - Step 3: Active Monitoring
        const sampleTable = listBoardsResponse.data.boards?.[0]?.table;
        if (sampleTable) {
            console.log(`\n📡 Step 3 Action: fetch_recent_posts from ${sampleTable}`);
            const fetchResponse = await axios.post(bridgeUrl, {
                action: 'fetch_recent_posts',
                table: sampleTable,
                limit: 3,
                last_id: 0
            }, {
                headers: { 'X-API-KEY': apiKey }
            });

            console.log("Posts Summary:", {
                count: fetchResponse.data.posts?.length,
                mapping: fetchResponse.data.mapping
            });
            console.log("Fetch Trace:", fetchResponse.data.trace);
        }

        // 4. Test Internal Debug Mode (Expected to fail if ALLOW_DEBUG=false)
        console.log("\n📡 Action: debug_spam_check (Expected 403 or Disabled)");
        try {
            const debugResponse = await axios.post(bridgeUrl, {
                action: 'debug_spam_check',
                table: sampleTable,
                post_id: 1
            }, {
                headers: { 'X-API-KEY': apiKey }
            });
            console.log("Debug Response:", debugResponse.data);
        } catch (e: any) {
            console.log("Debug Access (Expected Result):", e.response?.status === 403 ? "Forbidden (Disabled as expected)" : e.message);
        }

        console.log("\n✅ Bridge v1.1.1 Verification Complete!");

    } catch (error: any) {
        console.error("❌ Bridge API test failed:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

verifyBridgeAPI();
