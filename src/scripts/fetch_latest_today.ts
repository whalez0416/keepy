import axios from "axios";

async function fetchAbsoluteLatest() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";

    try {
        console.log("🔍 Fetching LATEST post from 'md_board' (DESC)...");
        // We can't do DESC in the bridge fetch, so we'll use a high since_date to find todays posts
        const today = new Date().toISOString().substring(0, 10);

        const response = await axios.post(bridgeUrl, {
            action: 'fetch_recent_posts',
            table: 'md_board',
            limit: 10,
            last_id: 5000, // Guessing we have several thousand
            since_date: today + " 00:00:00"
        }, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (response.data.success) {
            const posts = response.data.posts || [];
            console.log(`Found ${posts.length} posts from today.\n`);
            posts.forEach((p: any) => {
                console.log(`[ID: ${p.id}] [Date: ${p.date}] Subject: ${p.subject}`);
                console.log(`Content: ${p.content.substring(0, 100)}...`);
                console.log('---');
            });
        } else {
            console.error("❌ Fetch failed:", response.data.error);
        }
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

fetchAbsoluteLatest();
