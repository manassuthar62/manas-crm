const path = require('path');
const fs = require('fs');

console.log('CWD:', process.cwd());
console.log('__dirname (of this script):', __dirname);

const rootUploads = path.resolve(process.cwd(), 'uploads');
console.log('Resolved root/uploads:', rootUploads);
console.log('Exists:', fs.existsSync(rootUploads));

if (fs.existsSync(rootUploads)) {
    console.log('Files in root/uploads:', fs.readdirSync(rootUploads));
}

const serverRoutesUploads = path.resolve(process.cwd(), 'server', 'routes', '..', '..', 'uploads');
console.log('Resolved server/routes/../../uploads:', serverRoutesUploads);
console.log('Exists:', fs.existsSync(serverRoutesUploads));
