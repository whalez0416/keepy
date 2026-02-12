
import fs from 'fs';
import axios from 'axios';
import path from 'path';

async function updateBridge() {
    try {
        const bridgePath = path.resolve(process.cwd(), 'keepy_bridge.php');
        const bridgeCode = fs.readFileSync(bridgePath, 'utf8');

        // Update version in code to track changes
        const newVersion = '1.0.2';
        const updatedCode = bridgeCode.replace(/\$VERSION = '[\d.]+';/, `$VERSION = '${newVersion}';`);

        console.log(`Read keepy_bridge.php (${updatedCode.length} bytes). Sending update to server...`);

        const response = await axios.post('https://minhospital.co.kr/keepy_bridge.php', {
            action: 'self_update',
            code: updatedCode
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Server Response:', response.data);

        if (response.data.success) {
            console.log('✅ Bridge updated successfully!');
            // Now verify with list_tables
            const listResponse = await axios.post('https://minhospital.co.kr/keepy_bridge.php', {
                action: 'list_tables'
            });
            console.log('📋 Available Tables:', listResponse.data.tables);
        } else {
            console.error('❌ Update failed:', response.data.error);
        }

    } catch (error: any) {
        console.error('Error updating bridge:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

updateBridge();
