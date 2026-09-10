const http = require('http');
const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hallo von meiner Jenkins CI/CD Pipeline!\n');
  res.end('Hallo! Meine Pipeline hat sich automatisch aktualisiert!\n');
});

server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
