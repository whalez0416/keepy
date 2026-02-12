
import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

async function uploadBridge() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;
    console.log('Starting automated bridge upload via FTP...');

    try {
        await client.access({
            host: 'minhospital.co.kr',
            user: 'minhospital2008',
            password: 'minho3114*',
            secure: false
        });

        console.log('✅ Connected to FTP.');

        const localPath = path.resolve(process.cwd(), 'keepy_bridge.php');
        const remotePath = '/www/keepy_bridge.php';

        console.log(`Uploading ${localPath} to ${remotePath}...`);

        await client.uploadFrom(localPath, remotePath);

        console.log('✅ Upload completed successfully!');

        await client.close();
    } catch (error: any) {
        console.error('❌ Upload Failed:', error.message);
        process.exit(1);
    }
}

uploadBridge();
