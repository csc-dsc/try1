import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const sheet = postcss.parse(readFileSync(new URL('../prism-theme.css', import.meta.url), 'utf8'));
const color = (selector, property) => {
  let value;
  sheet.walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls(property, declaration => { value = declaration.value; });
  });
  assert.match(value ?? '', /^#[\da-f]{6}$/i, selector + ': ' + property);
  return value;
};
const gradientStop = (selector, index) => {
  let value;
  sheet.walkRules((rule) => {
    if (rule.selector !== selector || rule.parent.type === 'atrule') return;
    rule.walkDecls('background', declaration => { value = declaration.value; });
  });
  assert.match(value ?? '', /^linear-gradient\(/, selector + ': background');
  const stops = value.match(/#[\da-f]{6}/gi) ?? [];
  assert.ok(stops.length >= 3, selector + ': expected three gradient stops');
  return stops[index];
};
const luminance = hex => {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  return channels.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
};
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
const pairs = [
  ['light invitation', 'html[data-theme="light"] .links-band', 'color', 'html[data-theme="light"] .links-band', 'background'],
  ['light GitHub link', 'html[data-theme="light"] .links-band .outro-composition a', 'color', 'html[data-theme="light"] .links-band', 'background'],
  ['prism homepage', 'html[data-theme="prism"] .hero', 'color', 'html[data-theme="prism"] .hero', 'background'],
  ['prism profile portrait', 'html[data-theme="prism"] .intro-band', 'color', 'html[data-theme="prism"] .intro-band', 'background'],
  ['prism profile body text', 'html[data-theme="prism"] .intro-copy p', 'color', 'html[data-theme="prism"] .intro-band', 'background'],
  ['prism MIKU archive', 'html[data-theme="prism"] .archive-section', 'color', 'html[data-theme="prism"] .archive-section', 'background'],
  ['prism MIKU archive body', 'html[data-theme="prism"] .archive-copy p', 'color', 'html[data-theme="prism"] .archive-section', 'background'],
  ['prism MIKU motion', 'html[data-theme="prism"] .motion-section', 'color', 'html[data-theme="prism"] .motion-section', 'background'],
];
for (const [label, foregroundSelector, foregroundProperty, backgroundSelector, backgroundProperty] of pairs) {
  const ratio = contrast(color(foregroundSelector, foregroundProperty), color(backgroundSelector, backgroundProperty));
  assert.ok(ratio >= 4.5, label + ': ' + ratio.toFixed(2) + ':1 is below 4.5:1');
}
const signal = 'html[data-theme="prism"] .signal-section';
const signalContrast = contrast(color(signal, 'color'), gradientStop(signal, 0));
assert.ok(signalContrast >= 4.5, 'prism MIKU signal heading: ' + signalContrast.toFixed(2) + ':1 is below 4.5:1');
console.log('Light invitation and prism palette maintain at least 4.5:1 text contrast');
