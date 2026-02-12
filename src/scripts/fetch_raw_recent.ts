import axios from "axios";

async function fetchRawRecent() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";
    const sinceDate = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    try {
        console.log(`🔍 Fetching posts from 'md_board' since ${sinceDate}...`);
        const response = await axios.post(bridgeUrl, {
            action: 'fetch_recent_posts',
            table: 'md_board',
            limit: 10,
            last_id: 0,
            since_date: sinceDate
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (response.data.success) {
            const posts = response.data.posts || [];
            console.log(`Found ${posts.length} posts.\n`);
            posts.forEach((p: any) => {
                console.log(`[ID: ${p.id}] [Date: ${p.date}]`);
                console.log(`Subject: ${p.subject}`);
                console.log(`Content snippet: ${p.content.substring(0, 50)}...`);
                console.log('---');
            });
        } else {
            console.error("❌ Fetch failed:", response.data.error);
        }
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

fetchRawRecent();
