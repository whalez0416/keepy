
import * as ftp from 'basic-ftp';

async function testFTP() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;
    console.log('Attempting FTP connection to minhospital.co.kr...');

    try {
        await client.access({
            host: 'minhospital.co.kr',
            user: 'minhospital2008',
            password: 'minho3114*',
            secure: false
        });

        console.log('✅ Success! Connected to FTP.');

        const list = await client.list('/');
        console.log(`📂 Remote root contains ${list.length} items:`);
        list.forEach(item => console.log(` - ${item.name} (${item.isDirectory ? 'DIR' : 'FILE'})`));

        await client.close();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ FTP Connection Failed:', error.message);
        process.exit(1);
    }
}

testFTP();
