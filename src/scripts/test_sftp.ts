
import Client from 'ssh2-sftp-client';

async function testSFTP() {
    const sftp = new Client();
    console.log('Attempting SFTP connection to minhospital.co.kr...');

    try {
        await sftp.connect({
            host: 'minhospital.co.kr',
            port: 22,
            username: 'minhospital2008',
            password: 'minho3114*'
        });

        console.log('✅ Success! Connected to SFTP.');

        const list = await sftp.list('./www');
        console.log(`📂 Remote count: ${list.length}`);
        list.forEach(item => console.log(` - ${item.type} ${item.name}`));

        await sftp.end();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ SFTP Connection Failed:', error.message);
        process.exit(1);
    }
}

testSFTP();
