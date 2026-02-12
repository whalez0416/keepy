
import mysql from 'mysql2/promise';

async function testConnection() {
    console.log('Attempting direct DB connection to minhospital.co.kr...');

    try {
        const connection = await mysql.createConnection({
            host: 'minhospital.co.kr',
            user: 'minhospital2008',
            password: 'minho3114*',
            database: 'minhospital2008',
            connectTimeout: 5000
        });

        console.log('✅ Success! Connected to database directly.');

        const [rows] = await connection.execute('SHOW TABLES LIKE "g5_write_%"');
        console.log(`📋 Found ${(rows as any[]).length} tables.`);

        await connection.end();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ DB Connection Failed:', error.message);
        process.exit(1);
    }
}

testConnection();
