import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../prism-mode.js', import.meta.url), 'utf8');

function fixture({ page = 'index.html', saved = 'dark', previous = 'dark', miku = false, storage } = {}) {
  class Target {
    listeners = new Map();
    attributes = new Map();
    addEventListener(type, callback) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(callback);
      this.listeners.set(type, listeners);
    }
    fire(type) { this.listeners.get(type)?.forEach(callback => callback()); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    click() { this.fire('click'); }
  }
  const entries = storage ?? new Map([['site-theme', saved], ['site-theme-return', previous]]);
  const localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const root = { dataset: miku ? { mode: 'light' } : {} };
  const button = new Target();
  const normal = new Target();
  const document = new Target();
  document.documentElement = root;
  document.readyState = 'loading';
  document.getElementById = id => ({
    'prism-toggle': button,
    'theme-toggle': miku ? null : normal,
    'mode-toggle': miku ? normal : null,
  })[id] ?? null;
  if (miku) {
    normal.addEventListener('click', () => { root.dataset.mode = 'dark'; entries.set('miku-mode', 'dark'); });
  } else {
    normal.addEventListener('click', () => {
      const current = root.dataset.theme === 'prism' ? entries.get('site-theme-return') : root.dataset.theme;
      const next = current === 'light' ? 'dark' : 'light';
      if (next === 'light') root.dataset.theme = 'light';
      else delete root.dataset.theme;
      entries.set('site-theme', next);
    });
  }
  runInNewContext(source, { document, localStorage, queueMicrotask });
  document.readyState = 'interactive';
  document.fire('DOMContentLoaded');
  return { page, entries, root, button, normal };
}

let f = fixture({ saved: 'dark' });
assert.equal(f.root.dataset.theme, undefined);
f.button.click();
assert.equal(f.root.dataset.theme, 'prism');
assert.equal(f.button.getAttribute('aria-pressed'), 'true');
assert.equal(f.entries.get('site-theme-return'), 'dark');
f.button.click();
assert.equal(f.root.dataset.theme, undefined);
assert.equal(f.entries.get('site-theme'), 'dark');
assert.equal(f.button.getAttribute('aria-pressed'), 'false');

f = fixture({ saved: 'light' });
f.root.dataset.theme = 'light';
f.button.click();
assert.equal(f.entries.get('site-theme-return'), 'light');
const nextPage = fixture({ page: 'personal-instruction.html', storage: f.entries });
assert.equal(nextPage.root.dataset.theme, 'prism', 'Saved prism theme must apply before DOMContentLoaded');
assert.equal(nextPage.button.getAttribute('aria-pressed'), 'true');
nextPage.button.click();
assert.equal(nextPage.root.dataset.theme, 'light');
assert.equal(f.entries.get('site-theme'), 'light');

const miku = fixture({ page: 'miku-theme.html', saved: 'prism', previous: 'dark', miku: true });
assert.equal(miku.root.dataset.theme, 'prism');
miku.normal.click();
assert.equal(miku.root.dataset.mode, 'dark');
assert.equal(miku.root.dataset.theme, undefined, 'MIKU mode switch exits prism');
assert.equal(miku.entries.get('site-theme'), 'dark');
assert.equal(miku.button.getAttribute('aria-pressed'), 'false');

const fromPrism = fixture({ saved: 'prism', previous: 'light' });
fromPrism.normal.click();
await Promise.resolve();
assert.equal(fromPrism.root.dataset.theme, undefined, 'Normal theme switch toggles from saved light mode');
assert.equal(fromPrism.button.getAttribute('aria-pressed'), 'false');
assert.equal(fromPrism.entries.get('site-theme'), 'dark');

const pages = ['index.html', 'personal-instruction.html', 'other.html', 'platforms.html',
  'articles.html', 'links.html', 'miku-theme.html'];
for (const page of pages) {
  const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
  assert.ok(html.includes('href="prism-theme.css'), page + ' has palette');
  assert.ok(html.includes('src="prism-mode.js'), page + ' has behavior');
  assert.ok(html.includes('id="prism-toggle"'), page + ' has sphere control');
  const previousControl = page === 'miku-theme.html' ? 'id="mode-toggle"' : 'id="theme-toggle"';
  assert.ok(html.indexOf(previousControl) < html.indexOf('id="prism-toggle"'), page + ' puts sphere to the right');
  assert.ok(html.indexOf('site-theme\')===\'prism') < html.indexOf('<body'), page + ' applies saved theme before body');
}
console.log('Prism toggles and persists on all seven pages; dark/light and MIKU modes remain available');
