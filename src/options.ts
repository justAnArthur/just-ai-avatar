import { type Colors, type PaletteName, colorsFromHue, paletteColors } from './colors.ts';
import type { EmotionInput } from './emotions.ts';
import { BODIES, type BodyName, EYES, EYE_PAIRS, type EyeName, type EyePairName, type TileName } from './shapes.ts';

export type Motion = 'blink' | 'float' | 'look';

export interface AvatarOptions {
  /** Any string, e.g. a user or agent id. The same seed always gives the same avatar. */
  seed?: string;
  /** px number or any CSS length. */
  size?: number | string;
  palette?: PaletteName;
  /** OKLCH hue 0–359; overrides `palette`. */
  hue?: number | null;
  saturation?: number;
  /** Full color override. */
  colors?: Colors;
  /** Tile preset or any CSS border-radius. */
  tile?: TileName | (string & {});
  body?: BodyName;
  /** One shape for both eyes, a named pair, or `[left, right]`. */
  eyes?: EyeName | EyePairName | [EyeName, EyeName];
  /** Head tilt in degrees. */
  tilt?: number;
  spacing?: number;
  eyeScale?: number;
  /** -1 … 1 */
  gazeX?: number;
  /** -1 … 1 */
  gazeY?: number;
  animate?: boolean | Motion[];
  label?: string;
  /** Show an emotion (stays until cleared). Use `useEmotion()` or `el.emote()` to play one for a moment. */
  emotion?: EmotionInput | null;
  /** Force an emotion variant instead of the one the seed picks. */
  emotionVariant?: number;
}

export const DEFAULTS = {
  size: 160,
  palette: 'sky',
  hue: null,
  saturation: 100,
  tile: 'squircle',
  body: 'dome',
  eyes: 'oval',
  tilt: 12,
  spacing: 1,
  eyeScale: 1,
  gazeX: 0,
  gazeY: 0,
  animate: [],
  label: 'AI avatar',
} satisfies Required<Omit<AvatarOptions, 'seed' | 'colors' | 'emotion' | 'emotionVariant'>>;

export interface Resolved extends Required<Omit<AvatarOptions, 'seed' | 'eyes' | 'animate' | 'hue' | 'emotion' | 'emotionVariant'>> {
  /** Stable identity used to pick emotion variants: the seed, or the look itself. */
  seedKey: string;
  emotion?: AvatarOptions['emotion'];
  emotionVariant?: number;
  hue: number | null;
  eyes: [EyeName, EyeName];
  animate: Motion[];
}

// ------------------------------------------------------------------ seeding

export function rngFromSeed(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (const ch of seed) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_BODIES: BodyName[] = ['dome', 'dome', 'dome', 'peek', 'wide', 'arch', 'square', 'triangle', 'diamond', 'hexagon'];
const SEED_EYES: AvatarOptions['eyes'][] = ['oval', 'oval', 'round', 'tall', 'dot', 'square', 'pill', 'happy', 'wink'];

/** Deterministic options for a seed. */
export function optionsFromSeed(seed: string) {
  const r = rngFromSeed(seed);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)]!;
  const range = (min: number, max: number) => Math.round((min + r() * (max - min)) * 100) / 100;
  return {
    hue: Math.floor(r() * 360),
    body: pick(SEED_BODIES),
    eyes: pick(SEED_EYES)!,
    tilt: range(-14, 14),
    spacing: range(0.85, 1.15),
    eyeScale: range(0.9, 1.15),
    gazeX: range(-0.6, 0.6),
    gazeY: range(-0.4, 0.4),
  } satisfies AvatarOptions;
}

// ------------------------------------------------------------------ resolve

export function resolve(input: AvatarOptions = {}): Resolved {
  const given = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as AvatarOptions;
  const seeded = given.seed != null ? optionsFromSeed(given.seed) : {};
  const o = { ...DEFAULTS, ...seeded, ...given };
  // an explicit palette wins over a seeded hue
  if (given.palette && given.hue === undefined) o.hue = null;

  const colors = given.colors ?? (o.hue != null ? colorsFromHue(o.hue, o.saturation) : paletteColors(o.palette, given.saturation));
  const pair = typeof o.eyes === 'string' ? (o.eyes in EYE_PAIRS ? EYE_PAIRS[o.eyes as EyePairName] : [o.eyes, o.eyes]) : o.eyes;
  const eyes = pair.map((e) => (e in EYES ? e : 'oval')) as [EyeName, EyeName];
  const animate: Motion[] = o.animate === true ? ['blink', 'float', 'look'] : o.animate || [];

  return {
    ...o,
    body: o.body in BODIES ? o.body : 'dome',
    colors,
    eyes,
    animate,
    seedKey: given.seed ?? [o.hue ?? o.palette, o.body, eyes.join('+'), o.tilt, o.spacing].join('|'),
  };
}
