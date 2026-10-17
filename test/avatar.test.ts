import { describe, expect, test } from 'bun:test';
import { BODIES, EYES, EYE_PAIRS, PALETTES, colorsFromHue, layout, optionsFromSeed, resolve, roundedPolygon, type AccessoryName } from '../src/index.ts';
import { renderAvatarHTML } from '../src/server.ts';

describe('seeds', () => {
  test('same seed gives the same options', () => {
    expect(optionsFromSeed('agent-42')).toEqual(optionsFromSeed('agent-42'));
  });
  test('different seeds differ', () => {
    expect(optionsFromSeed('a')).not.toEqual(optionsFromSeed('b'));
  });
  test('explicit options override the seed', () => {
    expect(resolve({ seed: 'x', body: 'triangle' }).body).toBe('triangle');
  });
  test('explicit palette overrides the seeded hue', () => {
    expect(resolve({ seed: 'x', palette: 'mint' }).hue).toBeNull();
  });
});

describe('resolve', () => {
  test('named eye pairs expand', () => {
    expect(resolve({ eyes: 'wink' }).eyes).toEqual(EYE_PAIRS.wink);
  });
  test('unknown values fall back', () => {
    expect(resolve({ body: 'nope' as never, eyes: 'nope' as never })).toMatchObject({ body: 'dome', eyes: ['oval', 'oval'] });
  });
  test('avatars are animated unless asked not to be', () => {
    expect(resolve({}).animate).toBe(true);
    expect(resolve({ animate: false }).animate).toBe(false);
  });
});

describe('shapes', () => {
  test('every body but a whole one overflows the tile, so the tile always crops it', () => {
    for (const [name, b] of Object.entries(BODIES)) {
      if ('whole' in b) continue;
      const { x, y, w, h } = b.box;
      const overflows = x < 0 || y < 0 || x + w > 100 || y + h > 100;
      expect(overflows, name).toBe(true);
      expect(y + h, `${name} reaches the bottom edge`).toBeGreaterThan(100);
    }
  });
  const worn: AccessoryName[][] = [[], ['tie'], ['crown', 'tie'], ['antenna', 'glasses', 'tie']];
  test.each(worn.map((a) => [a.join(' + ') || 'nothing', a] as const))('a whole body wearing %s stays inside the tile', (_, accessories) => {
    for (const tilt of [-14, 0, 14]) {
      const L = layout({ body: 'orb', accessories, tilt });
      const { x, y, w, h } = L.body;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(100);
      expect(y + h).toBeLessThanOrEqual(100);
      for (const p of L.accessories.neck) expect(p.at!.y + 24 * p.at!.scale!, `tie tip, tilt ${tilt}`).toBeLessThanOrEqual(100);
      for (const p of L.accessories.head) expect(p.at!.y - 17 * p.at!.scale!, `hat top, tilt ${tilt}`).toBeGreaterThanOrEqual(0);
    }
  });
  test('a tie shrinks a whole body to make room and hangs from its bottom', () => {
    const plain = layout({ body: 'orb', tilt: 0 });
    const tied = layout({ body: 'orb', accessories: 'tie', tilt: 0 });
    expect(tied.body.h).toBeLessThan(plain.body.h);
    const knot = tied.accessories.neck[0]!.at!;
    expect(knot.x).toBeCloseTo(50);
    expect(knot.y).toBeCloseTo(tied.body.y + tied.body.h - tied.scale);
  });
  test('the neck slot combines with head and face', () => {
    expect(resolve({ accessories: ['crown', 'glasses', 'tie'] }).accessories).toEqual(['crown', 'glasses', 'tie']);
  });
  test('rounded polygon has steps+1 points per corner', () => {
    const poly = roundedPolygon([[50, 0], [100, 100], [0, 100]], 100, 100, 10, 4);
    expect(poly.startsWith('polygon(')).toBe(true);
    expect(poly.split(',').length).toBe(3 * 5);
  });
});

describe('render', () => {
  test.each(Object.keys(BODIES))('body %s renders', (body) => {
    const html = renderAvatarHTML({ body: body as keyof typeof BODIES });
    expect(html).toContain('role="img"');
    expect(html).toContain('container-type:inline-size');
  });
  test.each([...Object.keys(EYES), 'wink'])('eyes %s render', (eyes) => {
    expect(renderAvatarHTML({ eyes: eyes as never })).toContain('aria-label="AI avatar"');
  });
  test('polygon bodies use clip-path', () => {
    expect(renderAvatarHTML({ body: 'hexagon' })).toContain('clip-path:polygon(');
  });
  test('a still avatar has no keyframes or animations', () => {
    expect(renderAvatarHTML({})).toContain('@keyframes aiav-blink');
    for (const emotion of [undefined, 'love'] as const) {
      const html = renderAvatarHTML({ animate: false, emotion });
      expect(html).not.toContain('@keyframes');
      expect(html).not.toContain('animation:');
    }
  });
  test('idle life pauses while an emotion plays', () => {
    const html = renderAvatarHTML({ emotion: 'scared' });
    expect(html).not.toContain('aiav-blink 4.5s');
    expect(html).not.toContain('aiav-look 7s');
    expect(html).toContain('aiav-float 5s');
  });
  test('label is escaped', () => {
    expect(renderAvatarHTML({ label: '"><x>' })).not.toContain('"><x>');
  });
});

test('every palette resolves to colors', () => {
  for (const name of Object.keys(PALETTES)) {
    expect(resolve({ palette: name as keyof typeof PALETTES }).colors.core).toBeTruthy();
  }
  expect(colorsFromHue(233).bgTop).toBe('oklch(0.749 0.155 233)');
});
