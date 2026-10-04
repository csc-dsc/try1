import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';

const root = import.meta.dirname;
const legacy = [
  'platforms.html', 'articles.html', 'links.html',
  'miku-theme.html', 'assembly-tutorial.html',
  'frida-hook-tutorial.html', 'pwn-tutorial.html', 'hello.html',
  'index.css', 'index.js', 'visual-system.css', 'visual-system.js', 'tutorial-visual.css',
  'articles-scene.css', 'articles-scene.js',
  'platforms-scene.css', 'platforms-scene.js',
  'platforms-eye-events.css', 'platforms-eye-events.js',
  'site-header.css', 'auto-browse.js',
  'prism-theme.css', 'prism-mode.js',
  'miku-theme.css', 'miku-theme.js', 'favicon.ico',
  'image', 'history', 'new HTML',
];

export default defineConfig({
  base: '/try1/',
  plugins: [
    vue(),
    {
      name: 'preserve-legacy-pages',
      apply: 'build',
      closeBundle() {
        for (const entry of legacy) {
          cpSync(resolve(root, entry), resolve(root, 'dist', entry), { recursive: true });
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: { input: [resolve(root, 'index.html'), resolve(root, 'personal-instruction.html'), resolve(root, 'other.html')] },
  },
});
