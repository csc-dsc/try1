import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const sheet = postcss.parse(readFileSync(new URL('../light-theme.css', import.meta.url), 'utf8'));
const declaration = (selector, property) => {
  let value;
  sheet.walkRules((rule) => {
    if (!rule.selector.split(',').map(part => part.trim()).includes(selector)) return;
    rule.walkDecls(property, item => { value = item.value; });
  });
  assert.match(value ?? '', /^#[\da-f]{6}$/i, `${selector}: ${property}`);
  return value;
};
const luminance = hex => [1, 3, 5]
  .map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
  .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
const root = 'html[data-theme="light"]';
const links = `${root} body .links-band`;
const platforms = `${root} body.page-platforms`;
const miku = 'html:not([data-theme="prism"]):not([data-mode="dark"]) body.page-miku';
const pairs = [
  ['site body', declaration(root, '--paper'), declaration(root, '--ink')],
  ['site muted text', declaration(root, '--muted'), declaration(root, '--ink')],
  ['inverse ending', declaration(links, 'color'), declaration(links, 'background')],
  ['inverse link', declaration(`${links} .outro-composition a`, 'color'), declaration(links, 'background')],
  ['profile hero', declaration(`${root} body .profile-hero`, 'color'), declaration(`${root} body .profile-hero`, 'background')],
  ['platform entries', declaration(`${platforms} .platform-flow__entries`, 'color'), declaration(`${platforms} .platform-flow__entries`, 'background')],
  ['platform body copy', declaration(`${platforms} .platform-entry__copy p`, 'color'), declaration(`${platforms} .platform-flow__entries`, 'background')],
  ['MIKU archive', declaration(`${miku} .archive-section`, 'color'), declaration(`${miku} .archive-section`, 'background')],
  ['MIKU signal', declaration(`${miku} .signal-section`, 'color'), declaration(`${miku} .signal-section`, 'background')],
  ['MIKU motion', declaration(`${miku} .motion-section`, 'color'), declaration(`${miku} .motion-section`, 'background')],
  ['MIKU gallery', declaration(`${miku} .gallery-section`, 'color'), declaration(`${miku} .gallery-section`, 'background')],
  ['MIKU listening', declaration(`${miku} .listening-section`, 'color'), declaration(`${miku} .listening-section`, 'background')],
  ['MIKU footer', declaration(`${miku} .miku-footer`, 'color'), declaration(`${miku} .miku-footer`, 'background')],
];
for (const [label, foreground, background] of pairs) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
}

for (const page of ['index', 'platforms', 'articles', 'personal-instruction', 'links', 'other', 'miku-theme']) {
  const html = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.match(html, /light-theme\.css\?v=/, `${page}.html is missing the daylight palette`);
}
assert.match(readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8'), /'light-theme\.css'/);
console.log('Daylight palette maintains 4.5:1 contrast and is present on all seven pages');
