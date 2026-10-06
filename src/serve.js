import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};

async function resolveFile(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const target = resolve(join(root, decoded));
  if (target !== root && !target.startsWith(root + sep)) return null; // path traversal
  for (const candidate of [target, `${target}.html`, join(target, 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

/** Minimal static file server. Resolves "/about" to about.html and "/" to index.html. */
export function serve(dir, { port = 4173, host = '127.0.0.1' } = {}) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      const file = await resolveFile(root, req.url || '/');
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' }).end(String(err));
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => ok({ server, url: `http://${host}:${server.address().port}`, close: () => new Promise((r) => server.close(r)) }));
  });
}
