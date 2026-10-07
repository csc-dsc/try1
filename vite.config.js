import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { transform } from 'esbuild';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';

const root = import.meta.dirname;
let buildTarget;
const legacy = [
  'platforms.html', 'articles.html', 'links.html',
  'miku-theme.html', 'assembly-tutorial.html',
  'frida-hook-tutorial.html', 'pwn-tutorial.html', 'hello.html',
  'index.css', 'index.js', 'visual-system.css', 'visual-system.js', 'tutorial-visual.css', 'type-system.css', 'responsive.css',
  'articles-scene.css', 'articles-scene.js',
  'platforms-scene.css', 'platforms-scene.js',
  'platforms-eye-events.css', 'platforms-eye-events.js',
  'site-header.css', 'auto-browse.js',
  'prism-theme.css', 'prism-mode.js', 'light-theme.css',
  'miku-theme.css', 'miku-theme.js', 'favicon.ico',
  'image', 'history', 'new HTML',
  'history/access.css', 'history/access.js',
];

export default defineConfig({
  base: '/try1/',
  plugins: [
    vue(),
    {
      name: 'preserve-legacy-pages',
      apply: 'build',
      configResolved(config) {
        buildTarget = config.build.target;
      },
      async closeBundle() {
        let originalBytes = 0;
        let minifiedBytes = 0;
        let assetCount = 0;
        for (const entry of legacy) {
          const destination = resolve(root, 'dist', entry);
          cpSync(resolve(root, entry), destination, { recursive: true });
          const extension = extname(entry);
          if (extension !== '.js' && extension !== '.css') continue;

          const source = readFileSync(destination, 'utf8');
          // Transform each file separately: classic scripts keep their global bindings.
          const { code, warnings } = await transform(source, {
            loader: extension === '.css' ? 'css' : 'js',
            minify: true,
            target: buildTarget,
            charset: 'utf8',
            legalComments: 'eof',
            sourcemap: false,
            sourcefile: entry,
          });
          for (const warning of warnings) this.warn(`${entry}: ${warning.text}`);
          writeFileSync(destination, code);
          originalBytes += Buffer.byteLength(source);
          minifiedBytes += Buffer.byteLength(code);
          assetCount++;
        }
        const saved = ((1 - minifiedBytes / originalBytes) * 100).toFixed(1);
        console.log(`Legacy assets: ${assetCount} JS/CSS files, ${originalBytes} → ${minifiedBytes} bytes (${saved}% smaller)`);
      },
    },
  ],
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    sourcemap: false,
    rollupOptions: { input: [resolve(root, 'index.html'), resolve(root, 'personal-instruction.html'), resolve(root, 'other.html'), resolve(root, 'hobby-lab.html')] },
  },
});
