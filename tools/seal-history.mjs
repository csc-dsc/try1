import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const privateDirectory = process.argv[2] || process.env.GN_ARCHIVE_PRIVATE_DIR || 'D:/AI/site-private/try1/history';
const keys = JSON.parse(readFileSync(join(privateDirectory, 'keys.json'), 'utf8'));
const destination = join(root, 'history');
mkdirSync(destination, { recursive: true });
const rounds = 210000;

for (const id of ['about']) {
  const { password, proof } = keys[id];
  if (typeof password !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(password) || !/^[0-9a-f]{64}$/.test(proof)) throw new Error('Invalid archive credentials');
  if (readFileSync(join(privateDirectory, id + '.gnkey'), 'utf8').trim() !== proof) throw new Error('Key file does not match private config');
  const html = readFileSync(join(privateDirectory, id + '.html'), 'utf8');
  if (/CSC|csc|0x401|三件事发生在同一天|飞扬俱乐部|revers\.college|pwn\.college/.test(html)) throw new Error('Historical copy still contains removed details');
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(id + '\0' + password + '\0' + proof, salt, rounds, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('GN/history/' + id + '/v1'));
  const encrypted = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  const record = {
    version: 1, id, rounds,
    salt: salt.toString('base64'), iv: iv.toString('base64'), ciphertext: encrypted.toString('base64'),
  };
  writeFileSync(join(destination, 'vault-' + id + '.json'), JSON.stringify(record) + '\n');
}
console.log('Sealed the historical about page; its password and key file remain outside the repository');
