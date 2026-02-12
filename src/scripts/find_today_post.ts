import axios from "axios";

async function findTodayPost() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";
    const today = new Date().toISOString().substring(0, 10);

    try {
        console.log(`🔍 Searching for posts from ${today}...`);
        const response = await axios.post(bridgeUrl, {
            action: 'fetch_recent_posts',
            table: 'md_board',
            limit: 50,
            last_id: 999999, // Impossible high ID to force Date filter (due to OR)
            since_date: today + " 00:00:00"
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (response.data.success) {
            const posts = response.data.posts || [];
            console.log(`Found ${posts.length} posts from today.`);
            posts.forEach((p: any) => {
                console.log(`- [ID: ${p.id}] [Date: ${p.date}] Subject: ${p.subject}`);
                console.log(`  Content: ${p.content}`);
                console.log('---');
            });

            if (posts.length === 0) {
                console.log("No posts found. Maybe the table is different or date column is wrong.");
            }
        } else {
            console.error("❌ Fetch failed:", response.data.error);
        }
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

findTodayPost();
