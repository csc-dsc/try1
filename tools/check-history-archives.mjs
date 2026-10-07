import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const source = new URL('../history/', import.meta.url);
const built = new URL('../dist/history/', import.meta.url);
for (const folder of [source, built]) {
  const home = readFileSync(new URL('index.html', folder), 'utf8');
  assert.match(home, /class="history-home"/);
  assert.match(home, /href="about.html"/);
  assert.doesNotMatch(home, /archive-gate|CSC|csc|0x401|revers\.college|飞扬俱乐部/);
  assert.ok(!existsSync(new URL('vault-index.json', folder)), 'Historical homepage must not ship a vault');
  for (const id of ['about']) {
    const page = readFileSync(new URL(id + '.html', folder), 'utf8');
    const record = JSON.parse(readFileSync(new URL('vault-' + id + '.json', folder), 'utf8'));
    assert.equal(record.id, id);
    assert.equal(record.version, 1);
    assert.ok(record.rounds >= 200000);
    assert.equal(Buffer.from(record.salt, 'base64').length, 16);
    assert.equal(Buffer.from(record.iv, 'base64').length, 12);
    assert.ok(Buffer.from(record.ciphertext, 'base64').length > 1000);
    assert.deepEqual(Object.keys(record).sort(), ['ciphertext', 'id', 'iv', 'rounds', 'salt', 'version']);
    assert.match(page, /class="archive-gate"/);
    assert.match(page, /id="archive-keyfile"/);
    assert.doesNotMatch(page, /<div class="timeline-item"|0x401|CSC|csc|revers\.college|飞扬俱乐部/);
    assert.ok(existsSync(new URL('access.js', folder)) && existsSync(new URL('access.css', folder)));
  }
  for (const filename of ['keys.json','index.gnkey','about.gnkey','route.signal','profile.signal','route-proof.svg','profile-mark.png']) {
    assert.ok(!existsSync(new URL(filename, folder)), 'Private credential or old recoverable puzzle asset found: ' + filename);
  }
}
const gate = readFileSync(new URL('access.js', built), 'utf8');
assert.match(gate, /PBKDF2/);
assert.match(gate, /AES-GCM/);
assert.match(gate, /archive-keyfile/);
assert.ok(statSync(new URL('vault-about.json', built)).size > 1000);
console.log('Historical homepage is public; only the about archive is encrypted, without published credentials');
