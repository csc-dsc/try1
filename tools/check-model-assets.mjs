import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelRoot = resolve(siteRoot, 'public/models');
const index = JSON.parse(readFileSync(resolve(modelRoot, 'index.json'), 'utf8'));

function within(base, path) {
  const rel = relative(base, path);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

assert.equal(index.models.length, 3);
for (const model of index.models) {
  const scenePath = resolve(modelRoot, model.src);
  const licensePath = resolve(modelRoot, model.license);
  assert.ok(within(modelRoot, scenePath), `${model.id}: scene leaves model root`);
  assert.ok(within(modelRoot, licensePath), `${model.id}: license leaves model root`);
  assert.ok(existsSync(scenePath), `${model.id}: missing ${model.src}`);
  assert.ok(existsSync(licensePath), `${model.id}: missing ${model.license}`);

  const license = readFileSync(licensePath, 'utf8');
  assert.ok(license.includes('CC-BY-4.0'), `${model.id}: license mismatch`);
  assert.ok(license.includes(model.source), `${model.id}: source attribution mismatch`);
  assert.ok(license.includes(model.credit), `${model.id}: creator attribution mismatch`);

  const gltf = JSON.parse(readFileSync(scenePath, 'utf8'));
  const references = [...(gltf.buffers ?? []), ...(gltf.images ?? [])]
    .map((resource) => resource.uri)
    .filter((uri) => uri && !uri.startsWith('data:'));

  for (const uri of references) {
    const assetPath = resolve(dirname(scenePath), uri);
    assert.ok(within(dirname(scenePath), assetPath), `${model.id}: unsafe asset path ${uri}`);
    assert.ok(existsSync(assetPath), `${model.id}: missing asset ${uri}`);
  }

  console.log(`${model.id}: ${gltf.nodes.length} nodes, ${(gltf.animations ?? []).length} clips, ${references.length} external resources`);
}
