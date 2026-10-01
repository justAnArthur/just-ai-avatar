import { describe, expect, test } from 'bun:test';
import { toHex } from '../src/color-convert.ts';
import { BODIES, EYES, PALETTES, radiusPath, renderAvatarSVG } from '../src/index.ts';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('toHex', () => {
  test('oklch matches the original avatar colors', () => {
    // bgTop / bgBottom measured from the original image
    for (const [css, expected] of [['oklch(0.749 0.155 233)', '#02bcff'], ['oklch(0.643 0.196 252.5)', '#018dff']] as const) {
      const got = channels(toHex(css).hex);
      channels(expected).forEach((v, i) => expect(Math.abs(got[i]! - v)).toBeLessThanOrEqual(4));
    }
  });
  test('keeps alpha separately', () => {
    expect(toHex('oklch(0.616 0.15 243 / 0.35)').alpha).toBe(0.35);
    expect(toHex('rgb(40 10 160 / .4)')).toEqual({ hex: '#280aa0', alpha: 0.4 });
    expect(toHex('#abc')).toEqual({ hex: '#aabbcc', alpha: 1 });
  });
  test('out-of-gamut colors are mapped into sRGB', () => {
    expect(toHex('oklch(0.75 0.4 140)').hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('radiusPath', () => {
  test('square corners are straight lines', () => {
    expect(radiusPath('0', { x: 0, y: 0, w: 10, h: 10 })).not.toContain('A');
  });
  test('oversized radii are scaled down like CSS', () => {
    expect(radiusPath('999px', { x: 0, y: 0, w: 20, h: 10 })).toContain('A5 5');
  });
});

describe('renderAvatarSVG', () => {
  const all = [
    ...Object.keys(BODIES).map((body) => ({ body })),
    ...[...Object.keys(EYES), 'wink'].map((eyes) => ({ eyes })),
    ...Object.keys(PALETTES).map((palette) => ({ palette })),
    { tile: 'none' }, { tile: 'circle' }, { seed: 'agent-42' },
  ] as const;

  test.each(all.map((o) => [JSON.stringify(o), o] as const))('%s is a hex-only standalone SVG', (_, o) => {
    const svg = renderAvatarSVG(o as never);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).not.toContain('oklch');
    expect(svg).not.toContain('NaN');
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
  });

  test('size sets the pixel dimensions', () => {
    expect(renderAvatarSVG({ size: 512 })).toContain('width="512" height="512"');
  });
  test('idPrefix makes ids predictable', () => {
    expect(renderAvatarSVG({}, { idPrefix: 'me' })).toContain('id="me-tile"');
  });
});
