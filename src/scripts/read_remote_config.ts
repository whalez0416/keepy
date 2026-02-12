import Client from 'ssh2-sftp-client';

async function readConfig() {
    const sftp = new Client();
    try {
        console.log("Connecting...");
        await sftp.connect({
            host: 'minhospital.co.kr',
            port: 22,
            username: 'minhospital2008',
            password: 'minho3114*'
        });
        console.log("Downloading _config.php...");
        const data = await sftp.get('./www/_config.php');
        console.log("Content:");
        console.log("-------------------");
        console.log(data.toString());
        console.log("-------------------");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sftp.end();
    }
}

readConfig();
