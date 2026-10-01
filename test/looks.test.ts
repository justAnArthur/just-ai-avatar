import { describe, expect, test } from 'bun:test';
import { ACCESSORIES, BODIES, EMOTIONS, LOOKS, layout, optionsFromSeed, renderAvatarSVG, resolve } from '../src/index.ts';
import { renderAvatarHTML } from '../src/server.ts';

function balanced(svg: string) {
  const stack: string[] = [];
  for (const [tag] of svg.matchAll(/<[^>]+>/g)) {
    if (tag.endsWith('/>')) continue;
    if (tag.startsWith('</')) {
      if (stack.pop() !== tag.slice(2, -1)) return false;
    } else stack.push(tag.slice(1).split(/[\s>]/)[0]!);
  }
  return !stack.length;
}

describe('seeds', () => {
  test('older seeds keep their hue, eyes and pose', () => {
    // captured before looks and accessories existed
    expect(optionsFromSeed('agent-42')).toMatchObject({ hue: 52, eyes: 'wink', tilt: 3.77, spacing: 0.93, eyeScale: 1.14, gazeX: 0.07, gazeY: 0.06 });
    expect(optionsFromSeed('zeta')).toMatchObject({ hue: 24, eyes: 'pill', tilt: 8.38, spacing: 0.93, eyeScale: 1.03, gazeX: 0.47, gazeY: 0.05 });
  });
  test('seeds pick looks and accessories', () => {
    const picks = Array.from({ length: 200 }, (_, i) => optionsFromSeed(`s${i}`));
    expect(new Set(picks.map((p) => p.look)).size).toBe(LOOKS.length);
    expect(picks.some((p) => p.accessories.length)).toBe(true);
    expect(picks.some((p) => !p.accessories.length)).toBe(true);
  });
  test('explicit options brand a seed', () => {
    const o = resolve({ seed: 's1', look: 'flat', accessories: [] });
    expect(o.look).toBe('flat');
    expect(o.accessories).toEqual([]);
    expect(o.hue).toBe(optionsFromSeed('s1').hue);
  });
});

describe('accessories', () => {
  test('one per slot, the later wins', () => {
    expect(resolve({ accessories: ['beret', 'glasses', 'crown'] }).accessories).toEqual(['crown', 'glasses']);
    expect(resolve({ accessories: 'nope' as never }).accessories).toEqual([]);
  });
  test('hats fit in the tile: the body moves down to make room', () => {
    for (const body of Object.keys(BODIES) as (keyof typeof BODIES)[]) {
      const plain = layout({ body });
      const hat = layout({ body, accessories: 'beanie' });
      expect(hat.body.y, body).toBeGreaterThanOrEqual(plain.body.y);
      const tops = hat.accessories.head.map((p) => p.at!.y - 22 * p.at!.scale!);
      expect(Math.min(...tops), body).toBeGreaterThanOrEqual(0);
    }
  });
  test.each(Object.keys(ACCESSORIES))('%s renders in every look', (name) => {
    for (const look of LOOKS) {
      expect(renderAvatarHTML({ look, accessories: name as never })).toContain('<path');
      expect(balanced(renderAvatarSVG({ look, accessories: name as never }))).toBe(true);
    }
  });
});

describe('looks', () => {
  test.each([...LOOKS])('%s renders every body as HTML and SVG', (look) => {
    for (const body of Object.keys(BODIES) as (keyof typeof BODIES)[]) {
      expect(renderAvatarHTML({ look, body })).toContain('role="img"');
      const svg = renderAvatarSVG({ look, body });
      expect(balanced(svg), body).toBe(true);
      expect(svg).not.toContain('oklch(');
    }
  });
  test('glow stays divs, the other looks are inline SVG', () => {
    expect(renderAvatarHTML({ look: 'glow' })).not.toContain('<svg');
    expect(renderAvatarHTML({ look: 'flat' })).toContain('<svg');
  });
  test('plush is furry, clay is lit', () => {
    expect(renderAvatarSVG({ look: 'plush' })).toContain('feTurbulence');
    expect(renderAvatarSVG({ look: 'clay' })).toContain('feOffset');
    expect(renderAvatarSVG({ look: 'flat' })).not.toContain('<filter');
  });
  test('static avatars on one page get distinct ids', () => {
    const ids = (html: string) => html.match(/id="([^"]+)-body"/)![1];
    expect(ids(renderAvatarHTML({ look: 'plush', hue: 10 }))).not.toBe(ids(renderAvatarHTML({ look: 'plush', hue: 200 })));
  });
  test('still looks have no animation', () => {
    const html = renderAvatarHTML({ look: 'plush', animate: false, emotion: 'love' });
    expect(html).not.toContain('animation:');
  });
  test.each([...EMOTIONS])('%s plays in every look', (emotion) => {
    for (const look of LOOKS) expect(balanced(renderAvatarSVG({ look, emotion }))).toBe(true);
  });
});

describe('cloud', () => {
  test('HTML masks circles, SVG clips them', () => {
    expect(renderAvatarHTML({ body: 'cloud' })).toContain('mask-image:radial-gradient(circle');
    expect(renderAvatarSVG({ body: 'cloud' })).toMatch(/<clipPath id="[^"]+-body"><path d="M[^"]*a[\d.]+ [\d.]+ 0 1 0/);
  });
});
