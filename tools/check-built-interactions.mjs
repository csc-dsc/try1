import { accessSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const asset of ['platforms-scene.js', 'auto-browse.js']) {
  try {
    accessSync(new URL(`../dist/${asset}`, import.meta.url));
  } catch {
    throw new Error(`Missing dist/${asset}; run npm run build before npm run check:build.`);
  }
}

const result = spawnSync(process.execPath, [
  '--test', 'tools/check-platforms-interactions.mjs', 'tools/check-auto-browse.mjs',
], {
  cwd: root,
  env: { ...process.env, SITE_TEST_BUILD: '1' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
