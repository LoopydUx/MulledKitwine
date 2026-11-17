import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev-only helper used by `/?capture=1`: the page renders still frames of the
 * 3D scene and posts them here so they can be committed as static fallbacks
 * (hero poster, reduced-motion chapters, "Inside the box" and closing art).
 * It is not part of the production build and adds no backend.
 */
function stillCapture(): Plugin {
  return {
    name: 'cana-still-capture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url ?? '/', 'http://localhost');
        const name = (url.searchParams.get('name') ?? '').replace(/[^a-z0-9.-]/gi, '');
        const kind = url.searchParams.get('kind') === 'data' ? 'data' : 'still';
        if (!name) {
          res.statusCode = 400;
          res.end('missing name');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          try {
            const dir =
              kind === 'data'
                ? path.resolve(server.config.root, 'src/config')
                : path.resolve(server.config.root, 'public/stills');
            await mkdir(dir, { recursive: true });
            const file = path.join(dir, name);
            const next = Buffer.concat(chunks);
            // unchanged output is left alone so a re-capture does not touch the module graph
            const previous = await readFile(file).catch(() => null);
            if (!previous || !previous.equals(next)) await writeFile(file, next);
            res.statusCode = 200;
            res.end('ok');
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
      // Stills are excluded from the file watcher (so a capture never reloads itself),
      // which also hides new files from Vite's public-file index: serve them directly.
      server.middlewares.use('/stills', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '');
        if (!/^[a-z0-9-]+\.webp$/i.test(name)) return next();
        try {
          const data = await readFile(path.resolve(server.config.root, 'public/stills', name));
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(data);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), stillCapture()],
  build: {
    target: 'es2022',
    // three.js + React Three Fiber live in one lazy chunk (about 255 kB gzipped) loaded after first paint
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    watch: {
      // captured stills should not trigger reloads mid-capture
      ignored: ['**/public/stills/**'],
    },
  },
});
