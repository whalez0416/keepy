import axios from "axios";

async function findLatestPost() {
    const bridgeUrl = "https://minhospital.co.kr/keepy_bridge.php";
    const apiKey = "keepy_secret_2024";

    try {
        console.log("📡 Phase 1: Listing all boards...");
        const boardsResponse = await axios.post(bridgeUrl, { action: 'list_boards' }, { headers: { 'X-API-KEY': apiKey } });
        const boards = boardsResponse.data.boards || [];

        console.log(`Found ${boards.length} boards. Checking latest post for each...\n`);

        for (const board of boards) {
            try {
                // To get the LATEST, we can't use the standard bridge fetch (which is ASC)
                // BUT we can use debug_spam_check with a high ID or just look at the last_activity meta from list_boards.
                // Actually, let's look at the list_boards output which already has last_activity.

                console.log(`Table: ${board.table.padEnd(20)} | Count: ${board.count.toString().padEnd(6)} | Last: ${board.last_activity}`);
            } catch (e) { }
        }

        console.log("\n📡 Phase 2: Fetching actual rows from top candidate...");
        // If the user just posted, one of these should have a "2026-02-09" date.

        // Let's try to find a table with a 2026 date in last_activity
        const pilotTable = boards.find((b: any) => b.last_activity && b.last_activity.includes('2026-02-09'));

        if (pilotTable) {
            console.log(`\n✅ Found table with activity today: ${pilotTable.table}`);
            // Fetch it
            const fetchResponse = await axios.post(bridgeUrl, {
                action: 'fetch_recent_posts',
                table: pilotTable.table,
                limit: 5,
                last_id: 0
            }, { headers: { 'X-API-KEY': apiKey } });

            console.log("Recent Posts (ASC):");
            fetchResponse.data.posts.forEach((p: any) => {
                console.log(`- [ID: ${p.id}] [Date: ${p.date}] Subject: ${p.subject}`);
            });
        } else {
            console.log("\n❌ No table found with activity today (2026-02-09).");
            console.log("Maybe the timezone is different or the DB didn't update yet.");
        }

    } catch (e: any) {
        console.error("❌ Error:", e.message);
    }
}

findLatestPost();
