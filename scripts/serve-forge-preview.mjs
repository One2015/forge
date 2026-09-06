import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = 3010;
const publicRoot = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const overviewPath = '/forge-postman.html?route=%2Foverview';
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function respond(response, status, body = '') {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  if (requestUrl.pathname === '/') {
    response.writeHead(302, { 'Cache-Control': 'no-store', Location: overviewPath });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    respond(response, 400, 'Bad request');
    return;
  }

  const filePath = resolve(publicRoot, pathname.replace(/^\/+/, ''));
  if (filePath !== publicRoot && !filePath.startsWith(publicRoot + sep)) {
    respond(response, 403, 'Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      respond(response, 404, 'Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': fileStat.size,
      'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    respond(response, 404, 'Not found');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Forge preview cannot start: port ${port} is already in use.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Forge preview: http://${host}:${port}/`);
});
