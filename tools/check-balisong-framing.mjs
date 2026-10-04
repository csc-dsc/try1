import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ModelScene } from '../src/hobby/ModelScene.js';

const css = readFileSync(new URL('../src/ambient/inline-object.css', import.meta.url), 'utf8');
assert.match(css, /--balisong-zoom:\s*3\s*;/);

function measure({ inline, id, parent, canvas, zoom }) {
  const calls = {};
  const scene = Object.create(ModelScene.prototype);
  scene.inline = inline;
  scene.currentModel = { id };
  scene.modelSize = 0.5;
  scene.yaw = 0;
  scene.displayScale = 1;
  scene.scene = {};
  scene.canvas = {
    parentElement: { getBoundingClientRect: () => parent },
    getBoundingClientRect: () => canvas,
  };
  scene.renderer = {
    setPixelRatio: value => { calls.pixelRatio = value; },
    setSize: (...values) => { calls.size = values; },
    render: () => {},
  };
  scene.camera = {
    position: { set: (...values) => { calls.camera = values; } },
    lookAt: () => {},
    updateProjectionMatrix: () => {},
  };
  scene.root = {
    scale: { setScalar: value => { calls.modelScale = value; } },
    rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
  };
  const previousWindow = globalThis.window;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  globalThis.window = { devicePixelRatio: 2 };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => String(zoom) });
  try { scene.resize(); } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = previousGetComputedStyle;
  }
  return { scene, calls };
}

const desktop = measure({
  inline: true, id: 'balisong', zoom: 3,
  parent: { width: 314, height: 157 }, canvas: { left: 0, width: 942, height: 471 },
});
assert.equal(desktop.scene.displayScale, 3);
assert.equal(desktop.calls.pixelRatio, 6);
assert.deepEqual(desktop.calls.size, [314, 157, false]);
assert.equal(desktop.scene.camera.aspect, 2);
assert.equal(desktop.calls.modelScale, 6);
assert.deepEqual(desktop.calls.camera, [0, 0.2, 6.4]);
assert.equal(desktop.scene.baseYaw, Math.PI / 2);
assert.equal(desktop.scene.basePitch, 0);

const mobile = measure({
  inline: true, id: 'balisong', zoom: 3,
  parent: { width: 343, height: 450 }, canvas: { left: 0, width: 1029, height: 514.5 },
});
assert.equal(mobile.calls.pixelRatio, 6);
assert.deepEqual(mobile.calls.size, [343, 171.5, false]);
assert.equal(mobile.scene.camera.aspect, 2);
assert.equal(mobile.calls.modelScale, 6);
assert.equal(mobile.scene.baseYaw, Math.PI / 2);
assert.equal(mobile.scene.basePitch, 0);

mobile.scene.drag = { x: 100, y: 100, yaw: 0, pitch: 0 };
mobile.scene.onPointerMove({ clientX: 120, clientY: 112 });
assert.equal(mobile.scene.targetYaw, 0.4);
assert.ok(Math.abs(mobile.scene.targetPitch - 0.15) < 1e-10);
mobile.scene.drag = null;
mobile.scene.onPointerMove({ clientX: 1029 * .75, clientY: 257 });
assert.ok(mobile.scene.targetYaw > .44 && mobile.scene.targetYaw < .46);

const previousDocument = globalThis.document;
globalThis.document = { hidden: false };
try {
  mobile.scene.visible = true;
  mobile.scene.playing = false;
  mobile.scene.callbacks = {};
  mobile.scene.start = () => {};
  mobile.scene.lastFrame = 0;
  mobile.scene.yaw = 0;
  mobile.scene.targetYaw = .5;
  mobile.scene.targetPitch = .15;
  mobile.scene.drag = { x: 100, y: 100, yaw: 0, pitch: 0 };
  mobile.scene.tick(16.667);
  assert.ok(mobile.scene.yaw > .149 && mobile.scene.yaw < .151);
  mobile.scene.drag = null;
  mobile.scene.tick(33.334);
  assert.ok(mobile.scene.yaw > .219 && mobile.scene.yaw < .221);
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}

for (const [inline, id, span] of [[true, 'guitar', 2.7], [true, 'nunchaku', 2.5], [false, 'balisong', 3]]) {
  const other = measure({
    inline, id, zoom: 3,
    parent: { width: 900, height: 450 }, canvas: { left: 0, width: 2700, height: 1350 },
  });
  assert.equal(other.scene.displayScale, 1);
  assert.equal(other.calls.pixelRatio, 2);
  assert.deepEqual(other.calls.size, [900, 450, false]);
  assert.equal(other.calls.modelScale, span / 0.5);
}

const standaloneMobile = measure({
  inline: false, id: 'balisong', zoom: 3,
  parent: { width: 343, height: 450 }, canvas: { left: 0, width: 1029, height: 514.5 },
});
assert.equal(standaloneMobile.scene.baseYaw, 0.25);
assert.equal(standaloneMobile.scene.basePitch, Math.PI / 2);

console.log('Inline balisong: broadside view, responsive controls, 3x framing; other scenes unchanged');
