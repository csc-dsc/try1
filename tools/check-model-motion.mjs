import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';
import { GuitarStrings } from '../src/hobby/ModelScene.js';

const root = resolve(import.meta.dirname, '../public/models');

function source(id) {
  const dir = resolve(root, id);
  return {
    gltf: JSON.parse(readFileSync(resolve(dir, 'scene.gltf'), 'utf8')),
    bin: readFileSync(resolve(dir, 'scene.bin')),
  };
}

function numbers(gltf, bin, id) {
  const accessor = gltf.accessors[id];
  const view = gltf.bufferViews[accessor.bufferView];
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const width = accessor.componentType === 5126 ? 4 : accessor.componentType === 5123 ? 2 : 4;
  const count = accessor.count * (accessor.type === 'VEC3' ? 3 : 1);
  const stride = view.byteStride ?? width * (accessor.type === 'VEC3' ? 3 : 1);
  return Array.from({ length: count }, (_, index) => {
    const at = offset + Math.floor(index / 3) * stride + index % 3 * width;
    if (accessor.componentType === 5126) return bin.readFloatLE(at);
    if (accessor.componentType === 5123) return bin.readUInt16LE(offset + index * width);
    return bin.readUInt32LE(offset + index * width);
  });
}

const guitar = source('guitar');
const primitive = guitar.gltf.meshes.find((mesh) => mesh.name === 'Guitar_Strings_0').primitives[0];
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute(
  numbers(guitar.gltf, guitar.bin, primitive.attributes.POSITION), 3,
));
geometry.setIndex(numbers(guitar.gltf, guitar.bin, primitive.indices));
const rig = new GuitarStrings(new Mesh(geometry));
assert.equal(rig.groups.length, 6);
assert.ok(rig.groups.every((group) => group.vertices.length >= 8));
const before = Array.from(geometry.getAttribute('position').array);
rig.pluck(0);
rig.update(1 / 36);
const after = geometry.getAttribute('position').array;
assert.ok(rig.groups[0].vertices.some((index) => Math.abs(after[index * 3 + 2] - before[index * 3 + 2]) > 0.001));
assert.ok(rig.groups[1].vertices.every((index) => after[index * 3 + 2] === before[index * 3 + 2]));

const nunchaku = source('nunchaku').gltf;
for (const suffix of ['|Plane.002Action', '|PlaneAction']) {
  const clips = nunchaku.animations.filter((clip) => clip.name.endsWith(suffix));
  assert.equal(clips.length, 5);
  const tracks = clips.flatMap((clip) => clip.channels.map((channel) =>
    `${channel.target.node}:${channel.target.path}`));
  assert.equal(new Set(tracks).size, tracks.length);
}

console.log('Guitar: six independently deformable strings');
console.log('Nunchaku: two five-track action groups without overlapping targets');
