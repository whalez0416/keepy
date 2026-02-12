
import net from 'net';

const host = 'minhospital.co.kr';
const ports = [21, 22, 3306];

async function checkPort(port: number) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            console.log(`✅ Port ${port} is OPEN`);
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log(`❌ Port ${port} TIMED OUT`);
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            console.log(`❌ Port ${port} ERROR: ${err.message}`);
            resolve(false);
        });

        socket.connect(port, host);
    });
}

async function run() {
    console.log(`Checking connectivity to ${host}...`);
    for (const port of ports) {
        await checkPort(port);
    }
}

run();
