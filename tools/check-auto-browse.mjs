import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL(
  process.env.SITE_TEST_BUILD === '1' ? '../dist/auto-browse.js' : '../auto-browse.js',
  import.meta.url,
), 'utf8');
function fixture(page = 'index.html', { top = 0, height = 4800, ready = 'complete', loading = false, hidden = false } = {}) {
  class Target {
    listeners = new Map();
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    fire(type, event = {}) { this.listeners.get(type)?.forEach(callback => callback(event)); }
  }
  const document = new Target();
  class Element extends Target {
    attributes = new Map();
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    click() { this.fire('click'); }
    focus() { document.activeElement = this; }
    closest(selector) { return selector === '.auto-browse-control' ? controls : null; }
  }
  const controls = new Element();
  const button = new Element();
  const speedMenu = new Element();
  speedMenu.hidden = true;
  const options = new Map([2, 3, 4, 5].map(level => {
    const option = new Element();
    option.setAttribute('data-browse-level', String(level));
    return [level, option];
  }));
  controls.contains = node => [button, speedMenu, ...options.values()].includes(node);
  speedMenu.querySelectorAll = () => [...options.values()];
  const classes = new Set();
  const root = { classList: { toggle: (name, active) => active ? classes.add(name) : classes.delete(name) } };
  document.documentElement = root;
  document.hidden = hidden;
  document.readyState = ready;
  document.loading = loading;
  document.body = { classList: { contains: name => name === 'visual-loading' && document.loading } };
  document.scrollingElement = { scrollHeight: height };
  document.getElementById = id => ({ 'auto-browse-toggle': button, 'auto-browse-menu': speedMenu })[id] ?? null;
  const window = new Target();
  window.scrollY = top;
  window.scrollTo = ({ top }) => {
    window.scrollY = Math.round(top);
    window.fire('scroll');
  };
  const frames = new Map();
  let clock = 0;
  let frameId = 0;
  runInNewContext(source, {
    document, window, location: { pathname: '/try1/' + page }, innerHeight: 800,
    performance: { now: () => clock },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const advance = (milliseconds, step = 1000 / 60) => {
    const end = clock + milliseconds;
    while (clock < end) {
      clock = Math.min(end, clock + step);
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(clock));
      assert.ok(frames.size <= 1, 'Only one browsing frame may be pending');
    }
  };
  const active = () => button.getAttribute('aria-pressed') === 'true';
  const choose = (level) => {
    if (speedMenu.hidden) button.click();
    options.get(level).click();
  };
  const pause = () => {
    document.fire('keydown', { key: 'ArrowDown' });
  };
  const stopped = () => {
    assert.equal(active(), false);
    assert.equal(frames.size, 0);
    assert.equal(classes.has('is-auto-browsing'), false);
    assert.equal(button.getAttribute('title'), '自动浏览');
    const position = window.scrollY;
    advance(2000);
    assert.equal(window.scrollY, position);
  };
  return { button, controls, speedMenu, options, document, window, frames,
    attributes: button.attributes, classes, advance, active, choose, pause, stopped };
}

test('Only the three requested pages begin at level 1 automatically', () => {
  for (const page of ['index.html', '', 'personal-instruction.html', 'links.html']) {
    const f = fixture(page);
    assert.equal(f.frames.size, 1);
    f.advance(20);
    assert.equal(f.active(), true);
    assert.equal(f.attributes.get('data-browse-level'), '1');
    assert.equal(f.attributes.get('title'), '自动浏览');
    f.choose(2);
    assert.equal(f.active(), true);
    assert.ok(f.attributes.get('aria-label').includes('慢'));
    f.pause();
    f.stopped();
  }
  for (const page of ['platforms.html', 'articles.html', 'miku-theme.html', 'other.html', 'assembly-tutorial.html']) {
    const f = fixture(page);
    f.button.click();
    assert.equal(f.frames.size, 0);
    assert.equal(f.button.listeners.size, 0);
    assert.equal(f.window.listeners.size, 0);
  }
});

test('The default pace eases in and accumulates subpixels at 60 and 240 Hz', () => {
  const positions = [];
  for (const refresh of [60, 240]) {
    const f = fixture();
    f.advance(100, 1000 / refresh);
    assert.ok(f.window.scrollY <= 1);
    f.advance(5900, 1000 / refresh);
    assert.ok(f.window.scrollY >= 199 && f.window.scrollY <= 205);
    positions.push(f.window.scrollY);
    f.pause();
    f.stopped();
  }
  assert.ok(Math.abs(positions[0] - positions[1]) <= 1);
});

test('Levels 2–5 show the requested names and increase speed smoothly', () => {
  const names = ['慢', '中', '快', '较快'];
  const travel = [];
  for (let level = 2; level <= 5; level++) {
    const f = fixture();
    f.advance(6000);
    const before = f.window.scrollY;
    f.choose(level);
    assert.equal(f.attributes.get('data-browse-level'), String(level));
    assert.ok(f.attributes.get('aria-label').includes(names[level - 2]));
    assert.equal(f.speedMenu.hidden, true);
    assert.equal(f.document.activeElement, f.button);
    assert.equal(f.options.get(level).getAttribute('aria-checked'), 'true');
    f.advance(100);
    assert.ok(f.window.scrollY - before >= 3 && f.window.scrollY - before <= 6, 'The new speed must ease in');
    f.advance(5900);
    travel.push(f.window.scrollY - before);
    f.pause();
    f.stopped();
  }
  assert.ok(travel.every((distance, i) => !i || distance > travel[i - 1] * 1.25));
});

test('Changing to a slower level decelerates; a paused selection resumes from the current location', () => {
  const f = fixture();
  f.advance(1000);
  f.choose(5);
  f.advance(6000);
  const before = f.window.scrollY;
  f.choose(2);
  f.advance(100);
  assert.ok(f.window.scrollY - before >= 11, 'Slowing must begin from the current pace');
  f.advance(1900);
  const settled = f.window.scrollY;
  f.advance(1000);
  assert.ok(f.window.scrollY - settled >= 53 && f.window.scrollY - settled <= 55);
  f.pause();
  f.stopped();
  const paused = f.window.scrollY;
  f.choose(3);
  assert.equal(f.active(), true);
  assert.ok(f.attributes.get('aria-label').includes('中'));
  f.advance(6000);
  assert.ok(f.window.scrollY - paused >= 400 && f.window.scrollY - paused <= 407);
  f.pause();
  f.stopped();
});

test('Startup waits for the loader and visibility, and early manual input cancels pending autoplay', () => {
  const f = fixture('index.html', { ready: 'loading', loading: true });
  assert.equal(f.frames.size, 0);
  f.document.readyState = 'interactive';
  f.document.fire('DOMContentLoaded');
  f.advance(2000);
  assert.equal(f.window.scrollY, 0);
  assert.equal(f.active(), false);
  f.document.loading = false;
  f.advance(1000);
  assert.equal(f.active(), true);
  f.window.fire('wheel', { deltaY: 100 });
  f.stopped();
  const cancelled = fixture('links.html', { loading: true });
  cancelled.advance(200);
  cancelled.window.fire('wheel', { deltaY: -100 });
  cancelled.document.loading = false;
  cancelled.window.fire('load');
  cancelled.document.fire('DOMContentLoaded');
  cancelled.stopped();
  const background = fixture('personal-instruction.html', { hidden: true });
  background.document.hidden = false;
  background.document.fire('visibilitychange');
  background.advance(1000);
  assert.equal(background.active(), true);
  background.document.hidden = true;
  background.document.fire('visibilitychange');
  background.document.hidden = false;
  background.document.fire('visibilitychange');
  background.stopped();
});

test('Manual keys, wheel, touch, dragging and upward scrollbar changes still cancel browsing', () => {
  const actions = [
    ...['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape']
      .map(key => f => f.document.fire('keydown', { key })),
    f => f.window.fire('wheel', { deltaY: -100 }),
    f => f.window.fire('wheel', { deltaY: 100 }),
    f => f.window.fire('pointerdown', { target: {} }),
    f => f.window.fire('touchstart', { target: {} }),
    f => f.document.fire('click', { target: { closest: selector => selector === 'footer a[href="#top"]' ? {} : null } }),
    f => { f.window.scrollY -= 10; f.window.fire('scroll'); },
    f => { f.document.hidden = true; f.document.fire('visibilitychange'); },
    f => f.window.fire('pagehide'),
  ];
  for (const action of actions) {
    const f = fixture('links.html', { top: 200 });
    f.advance(2000);
    f.choose(4);
    action(f);
    f.stopped();
    f.window.fire('load');
    f.document.fire('DOMContentLoaded');
    f.advance(1000);
    assert.equal(f.active(), false, 'Manual control must not restart browsing');
  }
});

test('Opening and navigating the speed menu does not cancel scrolling', () => {
  const f = fixture();
  f.advance(2000);
  f.window.fire('pointerdown', { target: f.button });
  f.button.click();
  assert.equal(f.speedMenu.hidden, false);
  assert.equal(f.attributes.get('aria-expanded'), 'true');
  assert.equal(f.document.activeElement, f.options.get(2));
  f.window.fire('touchstart', { target: f.options.get(3) });
  f.document.fire('keydown', { key: ' ', target: f.options.get(3) });
  let prevented = false;
  f.document.fire('keydown', { key: 'ArrowDown', target: f.options.get(2), preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.document.activeElement, f.options.get(3));
  assert.equal(f.active(), true);
  f.options.get(3).click();
  assert.ok(f.attributes.get('aria-label').includes('中'));
  assert.equal(f.speedMenu.hidden, true);
  f.button.click();
  f.controls.fire('focusout', { relatedTarget: {} });
  assert.equal(f.speedMenu.hidden, true);
  assert.equal(f.active(), true);
  f.button.click();
  f.window.fire('pointerdown', { target: {} });
  assert.equal(f.speedMenu.hidden, true);
  f.stopped();
});

test('It stops at the bottom, notices content growth, and avoids jumps after delayed frames', () => {
  const short = fixture('personal-instruction.html', { height: 810 });
  short.advance(3000);
  assert.equal(short.window.scrollY, 10);
  short.stopped();
  short.choose(5);
  short.stopped();
  const growing = fixture('index.html', { height: 1000 });
  growing.advance(1000);
  growing.document.scrollingElement.scrollHeight = 5000;
  growing.choose(5);
  growing.advance(11000);
  assert.ok(growing.window.scrollY > 200 && growing.active());
  const before = growing.window.scrollY;
  growing.advance(1000, 1000);
  assert.ok(growing.window.scrollY - before <= 9);
  growing.pause();
  growing.stopped();
});

test('HTML exposes the selector and its script only on the three requested pages', () => {
  const allowed = ['index.html', 'personal-instruction.html', 'links.html'];
  for (const page of [...allowed, 'platforms.html', 'articles.html', 'miku-theme.html', 'other.html']) {
    const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    assert.equal(html.includes('id="auto-browse-toggle"'), allowed.includes(page), page);
    assert.equal(html.includes('src="auto-browse.js'), allowed.includes(page), page);
    assert.equal(html.includes('id="auto-browse-menu"'), allowed.includes(page), page);
    assert.ok(html.includes('href="site-header.css'), page);
    if (allowed.includes(page)) {
      assert.deepEqual([...html.matchAll(/data-browse-level="(\d)"/g)].map(match => Number(match[1])), [2, 3, 4, 5]);
      assert.equal(html.includes('auto-browse-heading'), false);
      assert.equal(html.includes('auto-browse-status'), false);
      assert.equal(html.includes('auto-browse-label'), false);
      assert.equal(html.includes('data-browse-stop'), false);
      assert.ok(html.indexOf('id="auto-browse-toggle"') < html.indexOf('id="theme-toggle"'));
    }
  }
});
