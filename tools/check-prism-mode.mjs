import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL(
  process.env.SITE_TEST_BUILD === '1' ? '../dist/prism-mode.js' : '../prism-mode.js',
  import.meta.url,
), 'utf8');

function fixture({ saved = 'dark', miku = false, legacyMode = null, storage, blocked = false } = {}) {
  class Target {
    listeners = new Map();
    attributes = new Map();
    dataset = {};
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    fire(type, event = {}) { this.listeners.get(type)?.forEach(callback => callback(event)); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    click(event = {}) { this.fire('click', event); }
    focus() { document.activeElement = this; }
  }
  const entries = storage ?? new Map(saved ? [['site-theme', saved]] : []);
  if (legacyMode) entries.set('miku-mode', legacyMode);
  const localStorage = {
    getItem(key) { if (blocked) throw new Error('Storage unavailable'); return entries.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage unavailable'); entries.set(key, value); },
  };
  const root = { dataset: {} };
  const button = new Target();
  button.setAttribute('title', 'old tooltip');
  const menu = new Target();
  menu.hidden = true;
  const control = new Target();
  const options = ['light', 'dark', 'prism'].map(theme => {
    const option = new Target();
    option.dataset.themeOption = theme;
    return option;
  });
  menu.querySelectorAll = () => options;
  control.contains = target => [control, button, menu, ...options].includes(target);
  const speedMenu = { hidden: false };
  const speedButton = new Target();
  speedButton.setAttribute('aria-expanded', 'true');
  const navigation = new Target();
  navigation.setAttribute('aria-expanded', 'true');
  navigation.addEventListener('click', () => navigation.setAttribute('aria-expanded', 'false'));
  const document = new Target();
  document.body = { classList: { contains: name => miku && name === 'page-miku' } };
  document.documentElement = root;
  document.readyState = 'loading';
  document.getElementById = id => ({
    'theme-toggle': button, 'theme-menu': menu, 'theme-control': control,
    'auto-browse-menu': speedMenu, 'auto-browse-toggle': speedButton, 'menu-toggle': navigation,
  })[id] ?? null;
  runInNewContext(source, { document, localStorage });
  document.readyState = 'interactive';
  document.fire('DOMContentLoaded');
  const choose = theme => {
    if (menu.hidden) button.click();
    options.find(option => option.dataset.themeOption === theme).click();
  };
  return { entries, root, button, menu, control, options, document, choose, speedMenu, speedButton, navigation };
}

for (const miku of [false, true]) {
  const f = fixture({ saved: 'light', miku });
  f.button.click();
  assert.equal(f.button.dataset.theme, 'light', 'Opening the menu must not change the theme');
  assert.equal(f.menu.hidden, false);
  assert.equal(f.button.getAttribute('aria-expanded'), 'true');
  assert.equal(f.document.activeElement, f.options[0]);
  assert.equal(f.speedMenu.hidden, true, 'Opening themes closes browsing speeds');
  assert.equal(f.speedButton.getAttribute('aria-expanded'), 'false');
  assert.equal(f.navigation.getAttribute('aria-expanded'), 'false');
  assert.equal(f.button.getAttribute('title'), undefined, 'No hover tooltip');
  for (const theme of ['prism', 'dark', 'light']) {
    f.choose(theme);
    assert.equal(f.button.dataset.theme, theme);
    assert.equal(f.root.dataset.theme, theme === 'dark' ? undefined : theme);
    assert.equal(f.entries.get('site-theme'), theme);
    assert.equal(f.menu.hidden, true);
    assert.equal(f.document.activeElement, f.button);
    assert.equal(f.options.filter(option => option.getAttribute('aria-checked') === 'true').length, 1);
    if (miku) assert.equal(f.root.dataset.mode, theme === 'dark' ? 'dark' : 'light');
  }
}

const keyboard = fixture();
const key = name => ({ key: name, preventDefault() {} });
keyboard.button.fire('keydown', key('ArrowDown'));
assert.equal(keyboard.document.activeElement, keyboard.options[0]);
keyboard.menu.fire('keydown', key('ArrowUp'));
assert.equal(keyboard.document.activeElement, keyboard.options[2]);
keyboard.menu.fire('keydown', key('Home'));
assert.equal(keyboard.document.activeElement, keyboard.options[0]);
keyboard.menu.fire('keydown', key('End'));
assert.equal(keyboard.document.activeElement, keyboard.options[2]);
keyboard.document.fire('keydown', key('Escape'));
assert.equal(keyboard.menu.hidden, true);
assert.equal(keyboard.document.activeElement, keyboard.button);
keyboard.button.click();
keyboard.document.fire('pointerdown', { target: keyboard.options[0] });
assert.equal(keyboard.menu.hidden, false);
keyboard.document.fire('pointerdown', { target: {} });
assert.equal(keyboard.menu.hidden, true, 'Outside pointer closes the menu');
keyboard.button.click();
keyboard.menu.fire('keydown', key('Tab'));
assert.equal(keyboard.menu.hidden, true);
keyboard.button.click();
keyboard.control.fire('focusout', { relatedTarget: {} });
assert.equal(keyboard.menu.hidden, true);

for (const miku of [false, true]) {
  for (const modifier of [{ altKey: true }, { ctrlKey: true }, { altKey: true, ctrlKey: true }]) {
    const f = fixture({ saved: 'light', miku });
    for (const next of ['prism', 'dark', 'light']) {
      f.button.click(modifier);
      assert.equal(f.button.dataset.theme, next, 'Existing modifier shortcut still moves back one step');
      assert.equal(f.menu.hidden, true);
      assert.equal(f.button.getAttribute('title'), undefined);
      if (miku) assert.equal(f.root.dataset.mode, next === 'dark' ? 'dark' : 'light');
    }
  }
}
const first = fixture();
first.choose('prism');
const nextPage = fixture({ storage: first.entries, miku: true });
assert.equal(nextPage.button.dataset.theme, 'prism');
nextPage.choose('light');
assert.equal(fixture({ storage: first.entries }).button.dataset.theme, 'light');
assert.equal(fixture({ saved: null, miku: true, legacyMode: 'dark' }).button.dataset.theme, 'dark');
assert.equal(fixture({ saved: null, miku: true }).button.dataset.theme, 'light');
assert.equal(fixture({ saved: 'invalid' }).button.dataset.theme, 'dark');
for (const miku of [false, true]) {
  const f = fixture({ miku, blocked: true });
  f.choose('prism');
  assert.equal(f.button.dataset.theme, 'prism');
}
for (const page of ['index', 'personal-instruction', 'other', 'platforms', 'articles', 'links', 'miku-theme']) {
  const html = readFileSync(new URL('../' + page + '.html', import.meta.url), 'utf8');
  assert.equal((html.match(/id="theme-toggle"/g) ?? []).length, 1);
  assert.equal((html.match(/role="menuitemradio" data-theme-option=/g) ?? []).length, 3);
  const trigger = html.match(/<button[^>]*id="theme-toggle"[^>]*>/)[0];
  assert.ok(!trigger.includes('title='), page + ' has no hover tooltip');
  assert.ok(trigger.includes('aria-haspopup="menu"') && trigger.includes('aria-controls="theme-menu"'));
  assert.ok(!html.includes('id="prism-toggle"') && !html.includes('id="mode-toggle"'));
}
console.log('Theme menu: direct selection, keyboard navigation, outside dismissal, persistence and no tooltip pass; modifier shortcut retained');
