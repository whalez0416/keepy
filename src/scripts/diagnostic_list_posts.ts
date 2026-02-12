import axios from "axios";

async function listRecentPosts() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";

    try {
        console.log("🔍 Fetching most recent posts from 'Board' table...");
        const response = await axios.post(bridgeUrl, {
            action: 'fetch_recent_posts',
            table: 'Board',
            limit: 5,
            last_id: 0 // Fetch from start but we'll see if they are ordered
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (response.data.success) {
            console.log("\nRecent Posts Found:", response.data.posts.length);
            response.data.posts.forEach((p: any) => {
                console.log(`- [ID: ${p.id}] [Date: ${p.date}] Subject: ${p.subject}`);
            });
            console.log("\nMapping used:", response.data.mapping);
        } else {
            console.error("❌ Fetch failed:", response.data.error);
        }
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

listRecentPosts();
