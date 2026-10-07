import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL(
  process.env.SITE_TEST_BUILD === '1' ? '../dist/platforms-scene.js' : '../platforms-scene.js',
  import.meta.url,
), 'utf8');
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

function fixture(reducedMotion = false) {
  class Target {
    listeners = new Map();
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    fire(type, event = {}) { this.listeners.get(type)?.forEach(callback => callback(event)); }
  }
  class Element extends Target {
    attributes = new Map();
    writes = new Map();
    classes = new Set();
    classList = {
      contains: name => this.classes.has(name),
      toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name),
    };
    properties = new Map();
    style = { setProperty: (key, value) => this.properties.set(key, value) };
    constructor(bounds) { super(); this.bounds = bounds; }
    getBoundingClientRect() { return this.bounds; }
    setAttribute(name, value) {
      this.attributes.set(name, value);
      this.writes.set(name, (this.writes.get(name) ?? 0) + 1);
    }
  }
  const eye = new Element(rect(200, 150, 600, 350));
  const eyeScene = new Element(rect(0, 100, 1000, 450));
  const heartScene = new Element(rect(0, 950, 1000, 260));
  const heart = new Element(rect(360, 950, 280, 260));
  const signal = new Element(rect(0, 810, 1000, 100));
  const gaze = new Element(rect(0, 0, 0, 0));
  const ecgPaths = [new Element(rect(0, 0, 0, 0))];
  const innerTrace = new Element(rect(0, 0, 0, 0));
  const animations = Array.from({ length: 8 }, () => ({
    playbackRate: 1,
    updatePlaybackRate(rate) { this.playbackRate = rate; },
  }));
  const heartParts = animations.map(animation => ({ getAnimations: () => [animation], style: {} }));
  heartScene.querySelectorAll = selector => selector === '[data-ecg-geometry]' ? ecgPaths : heartParts;
  heartScene.querySelector = () => innerTrace;
  const elements = new Map([
    ['.platform-eye-scene', eyeScene], ['.platform-eye', eye],
    ['[data-eye-gaze]', gaze], ['.platform-heart-scene', heartScene], ['.platform-heart', heart],
  ]);
  const document = new Target();
  document.hidden = false;
  document.querySelector = selector => elements.get(selector) ?? null;
  document.querySelectorAll = () => [eyeScene, heartScene, signal];
  const window = new Target();
  window.matchMedia = () => ({ matches: reducedMotion });
  const frames = new Map();
  let clock = 0;
  let frameId = 0;
  let observer;
  class Observer {
    targets = [];
    constructor(callback, options) { this.callback = callback; this.options = options; observer = this; }
    observe(target) { this.targets.push(target); }
  }
  window.IntersectionObserver = Observer;
  runInNewContext(source, {
    document, window, innerWidth: 1000, innerHeight: 800, IntersectionObserver: Observer,
    performance: { now: () => clock },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const advance = (milliseconds, step = 50) => {
    const end = clock + milliseconds;
    while (clock < end) {
      clock = Math.min(end, clock + step);
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(clock));
    }
  };
  const settle = () => {
    let iterations = 0;
    while (frames.size) {
      assert.ok(++iterations < 100, 'Gaze frame loop must stop once settled');
      advance(16, 16);
    }
  };
  const position = () => gaze.attributes.get('transform').match(/-?\d+(?:\.\d+)?/g).map(Number);
  const move = (clientX, clientY) => {
    document.fire('pointermove', { clientX, clientY, pointerType: 'mouse' });
    settle();
  };
  const state = () => heartScene.attributes.get('data-heart-state');
  const rate = () => animations[0].playbackRate;
  const hover = () => heart.fire('pointerenter', { pointerType: 'mouse' });
  const leave = () => heart.fire('pointerleave');
  const showHeart = () => {
    heartScene.bounds = rect(0, 550, 1000, 260);
    heart.bounds = rect(360, 550, 280, 260);
    window.fire('scroll');
  };
  const hideHeart = () => {
    heartScene.bounds = rect(0, 950, 1000, 260);
    heart.bounds = rect(360, 950, 280, 260);
    window.fire('scroll');
    settle();
  };
  return { document, window, eye, eyeScene, heartScene, heart, gaze, ecgPaths, animations, frames,
    observer, advance, settle, position, move, state, rate, hover, leave, showHeart, hideHeart };
}

const path = f => f.ecgPaths[0].attributes.get('d');
const points = f => {
  const value = path(f);
  if (value === 'M0 120H1000') return [[0, 120], [1000, 120]];
  return [...value.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(match => [Number(match[1]), Number(match[2])]);
};
const at = (samples, x) => {
  for (let i = 1; i < samples.length; i++) {
    if (samples[i][0] >= x) {
      const [left, a] = samples[i - 1];
      const [right, b] = samples[i];
      return a + (b - a) * (x - left) / (right - left);
    }
  }
  return samples.at(-1)[1];
};
const assertShifted = (before, after, shift) => {
  for (let x = 20; x <= 980 - shift; x += 20) {
    assert.ok(Math.abs(at(before, x) - at(after, x + shift)) < .025,
      'Historical samples must only translate right: x=' + x);
  }
};
const peakSpacing = (samples, limit = 1000, ceiling = 100) => {
  const peaks = [];
  let peak = null;
  samples.filter(([x]) => x <= limit).forEach(([x, y]) => {
    if (y < ceiling) {
      if (!peak || y < peak[1]) peak = [x, y];
    } else if (peak) {
      peaks.push(peak[0]);
      peak = null;
    }
  });
  assert.ok(peaks.length >= 2, 'Need at least two complete QRS peaks to compare spacing');
  return peaks.slice(1).reduce((sum, x, index) => sum + x - peaks[index], 0) / (peaks.length - 1);
};

test('Mouse outside the eye band still guides the visible eye, and distance changes displacement', () => {
  const f = fixture();
  f.move(550, 325);
  const near = f.position()[0];
  f.move(1600, 325);
  const far = f.position()[0];
  assert.ok(near > 0 && far > near * 2);
  assert.ok(far < 118);
  f.move(-1500, -1000);
  const [x, y] = f.position();
  assert.ok(x < 0 && y < 0);
  assert.ok(Math.hypot(x / 118, y / 36) <= 1);
});

test('Scrolling re-aims at a stationary mouse, including when only one pixel of the eye remains visible', () => {
  const f = fixture();
  f.move(650, 325);
  f.eye.bounds = rect(200, 400, 600, 350);
  f.window.fire('scroll');
  f.settle();
  assert.ok(f.position()[1] < 0);
  f.eye.bounds = rect(200, -349, 600, 350);
  f.window.fire('scroll');
  f.move(650, 200);
  assert.ok(f.eyeScene.classList.contains('is-active'));
  assert.ok(f.position()[1] > 0);
  f.eye.bounds = rect(200, -351, 600, 350);
  f.window.fire('scroll');
  f.move(900, 200);
  assert.deepEqual(f.position(), [0, 0]);
  assert.equal(f.frames.size, 0);
  assert.ok(f.observer.targets.includes(f.eye));
  assert.equal(f.observer.options.threshold, 0);
});

test('Normal ECG flows left to right without hovering and preserves the old samples', () => {
  const f = fixture();
  f.showHeart();
  const before = points(f);
  f.advance(1000);
  assert.equal(f.state(), 'idle');
  assert.equal(f.rate(), 1);
  assertShifted(before, points(f), 100);
  assert.notEqual(path(f), 'M0 120H1000');
  assert.ok(f.frames.size > 0, 'Visible normal ECG needs an ongoing transport loop');
  f.hideHeart();
  assert.equal(f.frames.size, 0);
});

test('Hover changes only new left samples; dense spikes diminish before the flat inlet', () => {
  const f = fixture();
  f.showHeart();
  const normal = points(f);
  const restingSpacing = peakSpacing(normal);
  f.hover();
  assert.equal(f.rate(), 1);
  f.advance(1000);
  const early = f.rate();
  assertShifted(normal, points(f), 100);
  f.advance(3000);
  const middle = f.rate();
  f.advance(3000);
  assert.ok(early > 1 && early < 1.2);
  assert.ok(middle > early && middle < f.rate());
  assert.equal(f.state(), 'peaking');
  assert.equal(f.rate(), 4);
  assert.ok(peakSpacing(points(f), 400) < restingSpacing * .65,
    'New left-side QRS peaks must become closer together during hover');
  f.advance(1200);
  assert.equal(f.state(), 'surging');
  f.advance(1200);
  assert.equal(f.state(), 'dense-high');
  f.advance(1600);
  assert.equal(f.state(), 'dense-lowering');
  f.advance(1600);
  assert.equal(f.state(), 'dense-low');
  assert.equal(f.rate(), 4);
  f.advance(1000);
  assert.equal(f.state(), 'fading');
  f.advance(1400);
  assert.equal(f.state(), 'fading');
  assert.ok(f.rate() > 0 && f.rate() < 4);
  assert.ok(Number(f.heartScene.properties.get('--heart-peak')) > 1);
  f.advance(1400);
  assert.equal(f.state(), 'flatline');
  assert.equal(f.heartScene.attributes.get('data-ecg-input'), 'flatline');
  assert.equal(f.rate(), 0);
  assert.ok(points(f).some(([, y]) => y < 100), 'Old sharp peaks must remain on the right');
  assert.ok(Math.abs(at(points(f), 0) - 120) < .01);
  const beforeFlatTransport = points(f);
  f.advance(1000);
  const after = points(f);
  assertShifted(beforeFlatTransport, after, 100);
  for (let x = 0; x < 98; x += 2) assert.ok(Math.abs(at(after, x) - 120) < .02);
  assert.ok(f.frames.size > 0, 'Old waves must keep moving after the inlet becomes flat');
  f.advance(10000);
  assert.equal(path(f), 'M0 120H1000');
  assert.equal(f.frames.size, 0, 'An entirely flat history can sleep until the next interaction');
});

test('Leaving starts new normal beats at the left while the right keeps its flat history', () => {
  const f = fixture();
  f.showHeart();
  f.hover();
  f.advance(30000);
  assert.equal(path(f), 'M0 120H1000');
  f.leave();
  assert.equal(f.state(), 'recovering');
  assert.equal(f.rate(), 0, 'The heart itself must recover gently');
  assert.equal(f.heartScene.attributes.get('data-ecg-input'), 'normal');
  f.advance(800);
  const samples = points(f);
  assert.ok(samples.some(([x, y]) => x < 80 && y < 100), 'New normal QRS must enter from the left');
  for (let x = 100; x <= 1000; x += 20) assert.ok(Math.abs(at(samples, x) - 120) < .01);
  assert.ok(f.rate() > 0 && f.rate() < 1);
  f.advance(4000);
  assert.equal(f.state(), 'idle');
  assert.equal(f.rate(), 1);
  assert.ok(f.frames.size > 0);
  f.hideHeart();
});

test('Late peaks get taller and twice as dense; lowering and fading preserve their spacing', () => {
  const f = fixture();
  f.showHeart();
  f.hover();
  f.advance(8200);
  const before = points(f);
  const earlierSpacing = peakSpacing(before, 160, 60);
  const earlierHeight = 120 - Math.min(...before.filter(([x]) => x < 160).map(([, y]) => y));
  f.advance(2800);
  const high = points(f);
  const highSpacing = peakSpacing(high, 140, 60);
  const highHeight = 120 - Math.min(...high.filter(([x]) => x < 140).map(([, y]) => y));
  assert.ok(highSpacing < earlierSpacing * .6, 'Late QRS peaks need substantially tighter spacing');
  assert.ok(highHeight > earlierHeight, 'The high-density plateau must also have taller peaks');
  f.advance(2600);
  const low = points(f);
  const lowHeight = 120 - Math.min(...low.filter(([x]) => x < 90).map(([, y]) => y));
  assert.ok(Math.abs(peakSpacing(low, 90) - highSpacing) < 2);
  assert.ok(lowHeight < highHeight * .6);
  f.advance(1400);
  assert.equal(f.state(), 'fading');
  assert.ok(Math.abs(peakSpacing(points(f), 90, 105) - highSpacing) < 2,
    'Fading lowers the height without stretching the beat spacing');
  assert.equal(f.rate() < 4, true, 'Mechanical heartbeat can settle without changing the ECG density');
  f.hideHeart();
});

test('Release and re-entry never rewrite old peaks or jump the current heart rate', () => {
  const f = fixture();
  f.showHeart();
  f.hover();
  f.advance(3500);
  const fast = f.rate();
  const beforeLeave = points(f);
  f.leave();
  assert.equal(f.rate(), fast);
  assertShifted(beforeLeave, points(f), 0);
  f.advance(1000);
  const recovering = f.rate();
  assert.ok(recovering > 1 && recovering < fast);
  const beforeEnter = points(f);
  f.hover();
  assert.equal(f.rate(), recovering);
  assertShifted(beforeEnter, points(f), 0);
  f.advance(1000);
  assert.ok(f.rate() > recovering);
  f.hideHeart();
  assert.equal(f.state(), 'idle');
  assert.equal(f.rate(), 1);
  assert.equal(f.frames.size, 0);
});

test('Touch cancellation restarts the normal inlet and background pauses do not age the history', () => {
  const f = fixture();
  f.showHeart();
  f.heart.fire('pointerdown', { pointerType: 'touch' });
  f.advance(1000);
  f.document.fire('pointercancel', { pointerType: 'touch' });
  assert.equal(f.state(), 'recovering');
  assert.equal(f.heartScene.attributes.get('data-ecg-input'), 'normal');
  f.advance(5000);
  assert.equal(f.rate(), 1);
  f.hover();
  f.advance(1000);
  const beforePause = points(f);
  f.document.hidden = true;
  f.document.fire('visibilitychange');
  assert.equal(f.frames.size, 0);
  f.advance(10000);
  assert.deepEqual(points(f), beforePause);
  f.document.hidden = false;
  f.document.fire('visibilitychange');
  f.advance(1000);
  assertShifted(beforePause, points(f), 100);
  assert.equal(f.state(), 'idle');
  f.hideHeart();
});

test('Waveform stays one continuous ordered path and inlet switches preserve the current endpoint', () => {
  const f = fixture();
  f.showHeart();
  const check = () => {
    const samples = points(f);
    assert.equal(path(f).match(/M/g).length, 1);
    assert.equal(samples[0][0], 0);
    assert.equal(samples.at(-1)[0], 1000);
    assert.ok(samples.every(([x, y], index) => Number.isFinite(x) && Number.isFinite(y)
      && (!index || x > samples[index - 1][0])));
  };
  const switchWithoutJump = action => {
    const before = at(points(f), 0);
    action();
    assert.ok(Math.abs(at(points(f), 0) - before) < .02);
    check();
  };
  f.advance(37, 37);
  switchWithoutJump(f.hover);
  f.advance(37 * 190, 37);
  check();
  switchWithoutJump(f.leave);
  f.advance(37 * 10, 37);
  switchWithoutJump(f.hover);
  f.advance(37 * 600, 37);
  check();
  switchWithoutJump(f.leave);
  f.advance(37 * 30, 37);
  check();
  f.hideHeart();
});

test('Streaming work stays bounded and renders no faster than 30 Hz', () => {
  const f = fixture();
  f.showHeart();
  const before = f.ecgPaths[0].writes.get('d');
  f.advance(1000, 16);
  assert.ok(f.ecgPaths[0].writes.get('d') - before <= 36);
  assert.ok(points(f).length <= 2003);
  f.hover();
  f.advance(7000, 16);
  assert.ok(points(f).length <= 2003);
  assert.equal(f.ecgPaths.length, 1);
  assert.equal(f.animations.length, 8);
  f.hideHeart();
});

test('Reduced motion keeps the waveform static and suppresses gaze/hover progression', () => {
  const f = fixture(true);
  f.showHeart();
  const before = path(f);
  f.move(900, 700);
  f.hover();
  f.advance(22000);
  assert.equal(f.gaze.attributes.get('transform') ?? 'translate(0 0)', 'translate(0 0)');
  assert.equal(f.frames.size, 0);
  assert.equal(path(f), before);
  assert.equal(f.state(), 'idle');
  assert.equal(f.rate(), 1);
});

test('The eye takeover pauses all scenes and resumes ECG transport without aging its history', () => {
  const f = fixture();
  f.showHeart();
  f.hover();
  f.advance(2500);
  const before = points(f);
  f.document.fire('platform-eye-sequence', { detail: { active: true } });
  assert.equal(f.frames.size, 0);
  assert.equal(f.eyeScene.classList.contains('is-active'), false);
  assert.equal(f.heartScene.classList.contains('is-active'), false);
  f.move(900, 500);
  f.observer.callback([{ target: f.eye, isIntersecting: true }, { target: f.heartScene, isIntersecting: true }]);
  f.window.fire('scroll');
  f.advance(18000);
  assert.equal(f.frames.size, 0, 'Visibility callbacks cannot restart a scene during takeover');
  assert.deepEqual(points(f), before);
  f.document.fire('platform-eye-sequence', { detail: { active: false } });
  assert.equal(f.eyeScene.classList.contains('is-active'), true);
  assert.equal(f.heartScene.classList.contains('is-active'), true);
  assert.equal(f.state(), 'idle');
  f.advance(1000);
  assertShifted(before, points(f), 100);
  f.hideHeart();
});
