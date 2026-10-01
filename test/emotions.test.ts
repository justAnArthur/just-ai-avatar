import { describe, expect, test } from 'bun:test';
import { EMOTIONS, EMOTION_ALIASES, emotionName, layout, renderAvatarSVG, variantCount } from '../src/index.ts';
import { renderAvatarHTML } from '../src/server.ts';

describe('emotions', () => {
  test('aliases resolve to real emotions', () => {
    for (const [alias, name] of Object.entries(EMOTION_ALIASES)) expect(emotionName(alias)).toBe(name);
    expect(emotionName('error')).toBe('scared');
    expect(emotionName('nope')).toBeNull();
  });

  test('the same seed always feels the same way', () => {
    const a = layout({ seed: 'agent-42', emotion: 'scared' }).emotion;
    const b = layout({ seed: 'agent-42', emotion: 'scared' }).emotion;
    expect(a).toEqual(b);
  });

  test('different seeds express an emotion differently', () => {
    for (const name of EMOTIONS) {
      if (variantCount(name) < 2) continue;
      const seen = new Set(Array.from({ length: 40 }, (_, i) => layout({ seed: `s${i}`, emotion: name }).emotion!.variant));
      expect(seen.size, name).toBeGreaterThan(1);
    }
  });

  test('emotionVariant overrides the seed', () => {
    expect(layout({ seed: 'x', emotion: 'love', emotionVariant: 2 }).emotion!.variant).toBe(2);
    expect(layout({ seed: 'x', emotion: 'love', emotionVariant: 5 }).emotion!.variant).toBe(2);
  });

  test('calm avatars have no emotion and untouched eyes', () => {
    const L = layout({ seed: 'x' });
    expect(L.emotion).toBeNull();
    expect(L.eyes.every((e) => Object.keys(e.mod).length === 0)).toBe(true);
  });

  const cases = EMOTIONS.flatMap((name) => Array.from({ length: variantCount(name) }, (_, v) => [name, v] as const));

  test.each(cases)('%s variant %d renders in HTML and SVG', (emotion, emotionVariant) => {
    for (const body of ['dome', 'triangle', 'arch'] as const) {
      const html = renderAvatarHTML({ body, emotion, emotionVariant });
      const svg = renderAvatarSVG({ body, emotion, emotionVariant });
      for (const out of [html, svg]) {
        expect(out).not.toContain('NaN');
        expect(out).not.toContain('undefined');
      }
      expect(html).toContain('@keyframes aiav-pop');
      const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
    }
  });
});
