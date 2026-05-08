import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Serve public/ directory index files (e.g. /docs/ -> public/docs/index.html)
function servePublicIndex() {
  return {
    name: 'serve-public-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('/')) {
          const filePath = resolve(__dirname, 'public', req.url.slice(1), 'index.html');
          try {
            const html = readFileSync(filePath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          } catch {}
        }
        next();
      });
    },
  };
}

// Vite serves text/* without a charset by default, so browsers fall
// back to latin-1 and mangle UTF-8 (em-dashes render as `â€"`). Set
// charset=utf-8 for the markdown / text files we ship in public/.
function utf8TextFiles() {
  return {
    name: 'utf8-text-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url.endsWith('.md')) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        } else if (url.endsWith('.txt')) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [utf8TextFiles(), servePublicIndex(), preact()],
  build: {
    outDir: 'dist/site',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        why: resolve(__dirname, 'why/index.html'),
        notes: resolve(__dirname, 'notes/index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
      },
    },
  },
});
