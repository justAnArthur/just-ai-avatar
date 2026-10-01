import { type AccessoryName, FACE_ACCESSORIES, HEAD_ACCESSORIES, pickAccessories } from './accessories.ts';
import { type Colors, PALETTES, type PaletteName, colorsFromHue, paletteColors } from './colors.ts';
import type { EmotionInput } from './emotions.ts';
import { LOOKS, type LookName } from './looks.ts';
import { BODIES, type BodyName, EYES, EYE_PAIRS, type EyeName, type EyePairName, type TileName } from './shapes.ts';

export type AvatarOptions = {
  /** Any string, e.g. a user id. The same seed always gives the same avatar; explicit options win over it. */
  seed?: string;
  /** Rendering: `glow`, `flat`, `plush` or `clay`. Accessories and emotions follow it. */
  look?: LookName;
  /** One per slot (head, face); the later wins, `[]` for none. */
  accessories?: AccessoryName | AccessoryName[];
  /** OKLCH hue of the accessories; complements the body by default. */
  accentHue?: number | null;
  /** px number or any CSS length. */
  size?: number | string;
  palette?: PaletteName;
  /** OKLCH hue 0–359, overrides `palette`. */
  hue?: number | null;
  saturation?: number;
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
  /** Idle life (blink, float, look around) and emotion motion. `false` renders a still image. */
  animate?: boolean;
  label?: string;
  /** Holds an emotion until cleared; `useEmotion()` / `el.emote()` play one for a moment. */
  emotion?: EmotionInput | null;
  /** Forces an emotion variant instead of the one the seed picks. */
  emotionVariant?: number;
};

export const DEFAULTS = {
  size: 160,
  look: 'glow',
  accessories: [],
  accentHue: null,
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
  animate: true,
  label: 'AI avatar',
} satisfies Required<Omit<AvatarOptions, 'seed' | 'colors' | 'emotion' | 'emotionVariant'>>;

export type Resolved = Required<Omit<AvatarOptions, 'seed' | 'eyes' | 'hue' | 'accentHue' | 'accessories' | 'emotion' | 'emotionVariant'>> & {
  hue: number | null;
  /** The hue every look derives from, also with a palette. */
  baseHue: number;
  accentHue: number;
  accessories: AccessoryName[];
  eyes: [EyeName, EyeName];
  emotion?: EmotionInput | null;
  emotionVariant?: number;
  /** Picks emotion variants: the seed, or the look itself when there is none. */
  seedKey: string;
};

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

const SEED_BODIES: BodyName[] = ['dome', 'dome', 'dome', 'peek', 'wide', 'arch', 'square', 'triangle', 'diamond', 'hexagon', 'cloud', 'drop', 'bean'];
const ACCENT_OFFSETS = [150, 180, 210, 35, 325];
const SEED_EYES: NonNullable<AvatarOptions['eyes']>[] = ['oval', 'oval', 'round', 'tall', 'dot', 'square', 'pill', 'happy', 'wink'];

/** The look a seed resolves to. */
export function optionsFromSeed(seed: string) {
  const r = rngFromSeed(seed);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)]!;
  const range = (min: number, max: number) => Math.round((min + r() * (max - min)) * 100) / 100;

  const base = {
    hue: Math.floor(r() * 360),
    body: pick(SEED_BODIES),
    eyes: pick(SEED_EYES),
    tilt: range(-14, 14),
    spacing: range(0.85, 1.15),
    eyeScale: range(0.9, 1.15),
    gazeX: range(-0.6, 0.6),
    gazeY: range(-0.4, 0.4),
  };
  // drawn after the original picks, so older seeds keep their hue, eyes and pose
  const head = r() < 0.5 ? [pick(HEAD_ACCESSORIES)] : [];
  const face = r() < 0.3 ? [pick(FACE_ACCESSORIES)] : [];
  return {
    ...base,
    look: pick([...LOOKS]),
    accessories: [...head, ...face],
    accentHue: (base.hue + pick(ACCENT_OFFSETS)) % 360,
  } satisfies AvatarOptions;
}

export function resolve(input: AvatarOptions = {}): Resolved {
  const given = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as AvatarOptions;
  const o = { ...DEFAULTS, ...(given.seed ? optionsFromSeed(given.seed) : {}), ...given };
  if (given.palette && given.hue === undefined) o.hue = null;

  const colors = given.colors ?? (o.hue == null ? paletteColors(o.palette, given.saturation) : colorsFromHue(o.hue, o.saturation));
  const pair = typeof o.eyes === 'string' ? (EYE_PAIRS[o.eyes as EyePairName] ?? [o.eyes, o.eyes]) : o.eyes;
  const eyes = pair.map((e) => (e in EYES ? e : 'oval')) as [EyeName, EyeName];

  const baseHue = o.hue ?? PALETTES[o.palette]?.hue ?? PALETTES.sky.hue;
  return {
    ...o,
    look: LOOKS.includes(o.look) ? o.look : 'glow',
    body: o.body in BODIES ? o.body : 'dome',
    colors,
    eyes,
    baseHue,
    accentHue: o.accentHue ?? (baseHue + 160) % 360,
    accessories: pickAccessories(o.accessories),
    seedKey: given.seed ?? [o.hue ?? o.palette, o.body, eyes.join('+'), o.tilt, o.spacing].join('|'),
  };
}
