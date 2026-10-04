import assert from 'node:assert/strict';
import { NunchakuRig } from '../src/hobby/NunchakuRig.js';

const rig = new NunchakuRig();
for (let index = 0; index < 120; index++) rig.update(1 / 60);
const atRest = { ...rig.follower.position };
assert.ok(Number.isFinite(rig.getHandleGap()));
assert.ok(rig.getHandleGap() < 1.35, 'handles separated farther than the chain can span');

rig.dragBy(130, -45);
for (let index = 0; index < 45; index++) rig.update(1 / 60);
const moved = Math.hypot(rig.follower.position.x - atRest.x, rig.follower.position.y - atRest.y);
assert.ok(moved > 15, 'free handle did not respond to dragging');
rig.release();
for (let index = 0; index < 180; index++) rig.update(1 / 60);
assert.ok(rig.getHandleGap() < 1.35, 'chain lost its connection after release');
assert.ok(Math.abs(rig.anchor.position.x + 38) < 2, 'anchored handle did not return');
rig.dispose();

console.log(`Nunchaku: two connected handles, ${Math.round(moved)} px drag response, damped return`);
