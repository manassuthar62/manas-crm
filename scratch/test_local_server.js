const http = require('http');

function checkServer() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/team', // A simple route to check
        method: 'GET',
        timeout: 2000
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(`Error reaching server: ${e.message}`);
    });

    req.on('timeout', () => {
        console.error('Request timed out');
        req.destroy();
    });

    req.end();
}

checkServer();
