const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MIME = { html: 'text/html', js: 'application/javascript', css: 'text/css' };

const server = http.createServer((req, res) => {
  const filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const abs = path.join(ROOT, filePath);
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(abs).slice(1);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(8080, () => process.stdout.write('Server on port 8080\n'));
