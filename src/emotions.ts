import type { Colors } from './colors.ts';
import { rngFromSeed } from './options.ts';

// emotions are data in tile units: the HTML renderer animates them, the SVG renderer draws a still frame

export const EMOTIONS = [
  'happy', 'laugh', 'love', 'wink', 'surprised', 'scared',
  'sad', 'crying', 'angry', 'sleepy', 'dizzy', 'thinking',
] as const;

export type EmotionName = (typeof EMOTIONS)[number];

/** App-event names: `emote('error')`, `emote('success')`. */
export const EMOTION_ALIASES = {
  joy: 'happy', success: 'happy', done: 'happy',
  lol: 'laugh',
  heart: 'love', like: 'love',
  fear: 'scared', error: 'scared', warning: 'scared',
  fail: 'sad', unhappy: 'sad',
  cry: 'crying',
  mad: 'angry', rage: 'angry',
  idle: 'sleepy', tired: 'sleepy',
  confused: 'dizzy',
  loading: 'thinking', wait: 'thinking', hmm: 'thinking',
  shock: 'surprised', wow: 'surprised',
} as const satisfies Record<string, EmotionName>;

export type EmotionInput = EmotionName | keyof typeof EMOTION_ALIASES;

export function emotionName(input: string | null | undefined): EmotionName | null {
  if (!input) return null;
  if ((EMOTIONS as readonly string[]).includes(input)) return input as EmotionName;
  return (EMOTION_ALIASES as Record<string, EmotionName>)[input] ?? null;
}

/** ms a triggered emotion plays before the avatar calms down. */
export const EMOTION_DURATION: Record<EmotionName, number> = {
  happy: 2200, laugh: 2600, love: 2800, wink: 1600, surprised: 2000, scared: 2800,
  sad: 3000, crying: 3400, angry: 2600, sleepy: 4000, dizzy: 3000, thinking: 3200,
};

export type EyeMod = {
  /** An SVG part draws the replacement. */
  hide?: boolean;
  scale?: [number, number];
  offset?: [number, number];
  /** Top-edge slant as a fraction of eye height: >0 angry (inner corner down), <0 sad (outer corner down). */
  cut?: number;
};

export type Part = {
  /** `face` moves with the eyes when they look around, `fx` stays put. */
  layer: 'face' | 'fx';
  d: string;
  fill?: string;
  stroke?: string;
  /** In the part's own units, before `at.scale`. */
  width?: number;
  opacity?: number;
  dash?: [number, number];
  at?: { x: number; y: number; scale?: number; rotate?: number };
  /** CSS animation, keyframes in EMOTION_KEYFRAMES. */
  anim?: string;
  /** Fixed animation pivot for orbits; default is the part's own center. */
  origin?: [number, number];
};

/** Blurred ellipse inside the body: blush, angry flush. */
export type Blob = { x: number; y: number; w: number; h: number; color: string; blur: number };

export type EmotionFrame = {
  name: EmotionName;
  variant: number;
  eyes: [EyeMod, EyeMod];
  parts: Part[];
  blobs: Blob[];
  /** CSS animation of the whole avatar. */
  motion?: string;
};

export type EmotionContext = {
  colors: Colors;
  s: number;
  face: { x: number; y: number };
  eyes: [EyeBox, EyeBox];
  tilt: number;
  rnd: () => number;
};

type EyeBox = { cx: number; cy: number; w: number; h: number };

const SHAPES = {
  heart: 'M0 0.9C-0.2 0.75-1 0.25-1-0.3C-1-0.75-0.65-1-0.35-1C-0.15-1 0-0.85 0-0.7C0-0.85 0.15-1 0.35-1C0.65-1 1-0.75 1-0.3C1 0.25 0.2 0.75 0 0.9Z',
  drop: 'M0-1C0.35-0.45 0.62-0.1 0.62 0.3A0.62 0.62 0 0 1-0.62 0.3C-0.62-0.1-0.35-0.45 0-1Z',
  sparkle: 'M0-1Q0.12-0.12 1 0Q0.12 0.12 0 1Q-0.12 0.12-1 0Q-0.12-0.12 0-1Z',
  star: starPath(5, 1, 0.45),
  vein: [0, 90, 180, 270].map((deg) => rotatePath([[0.22, -0.95], [0.22, -0.22], [0.95, -0.22]], deg)).join(''),
  z: 'M-0.5-0.5H0.5L-0.5 0.5H0.5',
  exclaim: 'M0-1V0.3M0 0.85V0.86',
  question: 'M-0.45-0.5Q-0.45-1 0-1Q0.45-1 0.45-0.6Q0.45-0.3 0-0.12V0.25M0 0.8V0.81',
  dot: 'M0 0V0.01',
  puff: 'M-0.6 0.2A0.4 0.4 0 0 1-0.2-0.45A0.45 0.45 0 0 1 0.45-0.35A0.4 0.4 0 0 1 0.6 0.25Z',
  spiral: spiralPath(),
  x: 'M-0.5-0.5L0.5 0.5M0.5-0.5L-0.5 0.5',
  line: 'M-0.5 0H0.5',
  arcUp: 'M-0.55 0.2Q0-0.65 0.55 0.2',
  arcDown: 'M-0.55-0.15Q0 0.6 0.55-0.15',
  chevronL: 'M-0.4-0.45L0.4 0L-0.4 0.45',
  chevronR: 'M0.4-0.45L-0.4 0L0.4 0.45',
} as const;

function starPath(points: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${+(Math.cos(a) * r).toFixed(3)} ${+(Math.sin(a) * r).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
}

function rotatePath(points: [number, number][], deg: number): string {
  const a = (deg * Math.PI) / 180;
  const p = points.map(([x, y]) => `${+(x * Math.cos(a) - y * Math.sin(a)).toFixed(3)} ${+(x * Math.sin(a) + y * Math.cos(a)).toFixed(3)}`);
  return `M${p[0]}Q${p[1]} ${p[2]}`;
}

function spiralPath(): string {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 3.5;
    const r = 0.04 + (t / (Math.PI * 3.5)) * 0.5;
    pts.push(`${+(Math.cos(t) * r).toFixed(3)} ${+(Math.sin(t) * r).toFixed(3)}`);
  }
  return `M${pts.join('L')}`;
}

const HEART = '#ff5c8a';
const TEAR = '#9fe2ff';
const ANGER = '#ff4d4d';
const GOLD = '#ffd84d';

type Build = (k: Kit) => Omit<EmotionFrame, 'name' | 'variant'>;

function kit(ctx: EmotionContext) {
  const { colors: c, s, face, eyes, tilt, rnd } = ctx;
  const ink = c.eyeMid;
  const stroke = 3.4 * s;
  const side = rnd() < 0.5 ? -1 : 1;

  const eyeStroke = (i: 0 | 1, d: string, opts: Partial<Part> = {}): Part => {
    const e = eyes[i];
    const size = Math.max(e.w, e.h * 0.8);
    return { layer: 'face', d, stroke: ink, width: stroke / size, at: { x: e.cx, y: e.cy, scale: size, rotate: -tilt }, anim: 'aiav-pop .35s cubic-bezier(.3,1.6,.5,1) both', ...opts };
  };

  const mouthY = face.y + Math.max(eyes[0].h, eyes[1].h) * 0.5 + 6 * s;
  const mouth = (d: string, w: number, opts: Partial<Part> = {}): Part => ({
    layer: 'face', d, stroke: ink, width: stroke / w,
    at: { x: face.x, y: mouthY, scale: w, rotate: -tilt },
    anim: 'aiav-pop .3s .05s cubic-bezier(.3,1.6,.5,1) both', ...opts,
  });

  const icon = (d: string, x: number, y: number, size: number, opts: Partial<Part> = {}): Part => ({
    layer: 'fx', d, at: { x, y, scale: size * s * 1.5 }, anim: 'aiav-pop .4s cubic-bezier(.3,1.6,.5,1) both', ...opts,
  });

  const head = { x: face.x, y: Math.max(9, face.y - 30 * s) };
  const outer = (i: 0 | 1) => eyes[i].cx + (i ? 1 : -1) * eyes[i].w * 0.75;

  return { c, s, eyes, face, rnd, side, ink, stroke, eyeStroke, mouth, icon, head, outer, mouthY };
}

type Kit = ReturnType<typeof kit>;

const hideBoth: [EyeMod, EyeMod] = [{ hide: true }, { hide: true }];

const smile = 'M-0.5 0Q0 0.55 0.5 0';
const grin = 'M-0.5-0.1Q0 0.75 0.5-0.1Z';
const frown = 'M-0.5 0.2Q0-0.35 0.5 0.2';
const wavy = 'M-0.5 0Q-0.375-0.18-0.25 0T0 0T0.25 0T0.5 0';
const smirk = 'M-0.5 0.05Q0.05 0.4 0.5-0.15';
const oMouth = 'M0-0.5A0.5 0.5 0 1 1 0 0.5A0.5 0.5 0 1 1 0-0.5Z';
const teeth = 'M-0.5-0.22H0.5V0.22H-0.5ZM-0.17-0.22V0.22M0.17-0.22V0.22M-0.5 0H0.5';

const VARIANTS: Record<EmotionName, Build[]> = {
  happy: [
    (k) => ({ eyes: hideBoth, parts: [k.eyeStroke(0, SHAPES.arcUp), k.eyeStroke(1, SHAPES.arcUp), k.mouth(smile, 11 * k.s)], blobs: [], motion: 'aiav-m-bounce .6s ease-in-out 2' }),
    (k) => ({
      eyes: [{ scale: [1.05, 0.5], offset: [0, -1] }, { scale: [1.05, 0.5], offset: [0, -1] }],
      parts: [k.mouth(smile, 12 * k.s)],
      blobs: blush(k),
      motion: 'aiav-m-bounce .7s ease-in-out 2',
    }),
    (k) => ({
      eyes: hideBoth,
      parts: [
        k.eyeStroke(0, SHAPES.arcUp), k.eyeStroke(1, SHAPES.arcUp), k.mouth(grin, 10 * k.s, { fill: k.c.eyeLine }),
        k.icon(SHAPES.sparkle, k.outer(k.side > 0 ? 1 : 0) + k.side * 4 * k.s, k.head.y + 4, 3.2, { fill: GOLD, anim: 'aiav-twinkle 1.2s ease-in-out infinite' }),
        k.icon(SHAPES.sparkle, k.outer(k.side > 0 ? 1 : 0) + k.side * 9 * k.s, k.head.y + 11, 2, { fill: GOLD, anim: 'aiav-twinkle 1.2s .4s ease-in-out infinite' }),
      ],
      blobs: [],
      motion: 'aiav-m-bounce .6s ease-in-out 2',
    }),
  ],
  laugh: [
    (k) => ({ eyes: hideBoth, parts: [k.eyeStroke(0, SHAPES.chevronL), k.eyeStroke(1, SHAPES.chevronR), k.mouth(grin, 12 * k.s, { fill: k.c.eyeLine })], blobs: [], motion: 'aiav-m-giggle .18s linear infinite' }),
    (k) => ({
      eyes: hideBoth,
      parts: [
        k.eyeStroke(0, SHAPES.arcUp), k.eyeStroke(1, SHAPES.arcUp), k.mouth(grin, 12 * k.s, { fill: k.c.eyeLine }),
        ...([0, 1] as const).map((i) => k.icon(SHAPES.drop, k.outer(i), k.eyes[i].cy + 2, 2.2, { fill: TEAR, anim: `aiav-drip 1s ${i * 0.3}s ease-in infinite` })),
      ],
      blobs: [],
      motion: 'aiav-m-giggle .2s linear infinite',
    }),
  ],
  love: [
    (k) => ({
      eyes: hideBoth,
      parts: [
        ...([0, 1] as const).map((i): Part => ({ layer: 'face', d: SHAPES.heart, fill: HEART, at: { x: k.eyes[i].cx, y: k.eyes[i].cy, scale: k.eyes[i].w * 0.62 }, anim: `aiav-pulse .9s ${i * 0.08}s ease-in-out infinite` })),
        k.mouth(smile, 10 * k.s),
      ],
      blobs: blush(k),
      motion: 'aiav-m-pulse .9s ease-in-out infinite',
    }),
    (k) => ({
      eyes: [{ scale: [1, 0.55], offset: [0, -0.5] }, { scale: [1, 0.55], offset: [0, -0.5] }],
      parts: [
        k.mouth(smile, 11 * k.s),
        ...[0, 1, 2].map((n) => k.icon(SHAPES.heart, k.face.x + (n - 1) * 12 * k.s + k.side * 3, k.head.y + 6 - n * 2, 2.6 - n * 0.4, { fill: HEART, anim: `aiav-rise 1.8s ${n * 0.45}s ease-out infinite` })),
      ],
      blobs: blush(k),
    }),
    (k) => ({
      eyes: hideBoth,
      parts: [
        ...([0, 1] as const).map((i): Part => ({ layer: 'face', d: SHAPES.heart, fill: HEART, at: { x: k.eyes[i].cx, y: k.eyes[i].cy, scale: k.eyes[i].w * 0.55 }, anim: 'aiav-pop .4s cubic-bezier(.3,1.6,.5,1) both' })),
        k.mouth(grin, 9 * k.s, { fill: k.c.eyeLine }),
        k.icon(SHAPES.heart, k.outer(k.side > 0 ? 1 : 0) + k.side * 5 * k.s, k.head.y + 6, 3, { fill: HEART, anim: 'aiav-rise 1.6s ease-out infinite' }),
      ],
      blobs: [],
    }),
  ],
  wink: [
    (k) => {
      const w = k.side > 0 ? 1 : 0;
      const eyes: [EyeMod, EyeMod] = [{}, {}];
      eyes[w] = { hide: true };
      return { eyes, parts: [k.eyeStroke(w, SHAPES.arcUp), k.mouth(smirk, 10 * k.s), k.icon(SHAPES.sparkle, k.outer(w as 0 | 1) + k.side * 3 * k.s, k.eyes[w]!.cy - 9 * k.s, 2.6, { fill: GOLD, anim: 'aiav-twinkle 1s ease-in-out infinite' })], blobs: [] };
    },
    (k) => {
      const w = k.side > 0 ? 1 : 0;
      const eyes: [EyeMod, EyeMod] = [{ scale: [1.05, 1.05] }, { scale: [1.05, 1.05] }];
      eyes[w] = { hide: true };
      return { eyes, parts: [k.eyeStroke(w, SHAPES.line), k.mouth(smile, 10 * k.s)], blobs: [], motion: 'aiav-m-tilt 1.6s ease-in-out both' };
    },
  ],
  surprised: [
    (k) => ({
      eyes: [{ scale: [1.25, 1.25] }, { scale: [1.25, 1.25] }],
      parts: [k.mouth(oMouth, 4.5 * k.s), k.icon(SHAPES.exclaim, k.face.x + k.side * 16 * k.s, k.head.y, 6, { stroke: GOLD, width: 0.32, anim: 'aiav-pop .35s cubic-bezier(.3,1.8,.5,1) both' })],
      blobs: [],
      motion: 'aiav-m-pop .4s ease-out both',
    }),
    (k) => ({
      eyes: [{ scale: [1.3, 1.15], offset: [0, -1] }, { scale: [1.3, 1.15], offset: [0, -1] }],
      parts: [
        k.mouth(oMouth, 7 * k.s, { fill: k.c.eyeLine }),
        ...[-1, 0, 1].map((n) => k.icon('M0-0.6V0.6', k.face.x + n * 7 * k.s, k.head.y + Math.abs(n) * 2, 3, { stroke: k.ink, width: 0.35, at: { x: k.face.x + n * 7 * k.s, y: k.head.y + Math.abs(n) * 2.5, scale: 3 * k.s, rotate: n * 25 } })),
      ],
      blobs: [],
      motion: 'aiav-m-pop .4s ease-out both',
    }),
  ],
  scared: [
    (k) => ({
      eyes: [{ scale: [0.75, 1.15] }, { scale: [0.75, 1.15] }],
      parts: [k.mouth(wavy, 12 * k.s), sweat(k, 0)],
      blobs: [],
      motion: 'aiav-m-tremble .12s linear infinite',
    }),
    (k) => ({
      eyes: [{ scale: [1.2, 1.2], offset: [0, -0.5] }, { scale: [1.2, 1.2], offset: [0, -0.5] }],
      parts: [k.mouth(oMouth, 6 * k.s, { fill: k.c.eyeLine, anim: 'aiav-pop .3s both, aiav-quiver .15s .3s linear infinite' }), sweat(k, 0), sweat(k, 0.5, -1)],
      blobs: [],
      motion: 'aiav-m-tremble .1s linear infinite',
    }),
    (k) => ({
      eyes: [{ scale: [0.9, 1], offset: [k.side * 2.5 * k.s, 0], cut: -0.25 }, { scale: [0.9, 1], offset: [k.side * 2.5 * k.s, 0], cut: -0.25 }],
      parts: [k.mouth(wavy, 11 * k.s), sweat(k, 0), k.icon(SHAPES.exclaim, k.face.x - k.side * 16 * k.s, k.head.y + 2, 5, { stroke: k.ink, width: 0.32 })],
      blobs: [],
      motion: 'aiav-m-tremble .12s linear infinite',
    }),
  ],
  sad: [
    (k) => ({
      eyes: [{ cut: -0.45, offset: [0, 1] }, { cut: -0.45, offset: [0, 1] }],
      parts: [k.mouth(frown, 10 * k.s)],
      blobs: [],
      motion: 'aiav-m-droop 1s ease-out both',
    }),
    (k) => ({
      eyes: hideBoth,
      parts: [k.eyeStroke(0, SHAPES.arcDown), k.eyeStroke(1, SHAPES.arcDown), k.mouth(frown, 9 * k.s), k.icon(SHAPES.drop, k.eyes[k.side > 0 ? 1 : 0].cx, k.eyes[k.side > 0 ? 1 : 0].cy + 5 * k.s, 2.4, { fill: TEAR, anim: 'aiav-drip 1.6s ease-in infinite' })],
      blobs: [],
      motion: 'aiav-m-droop 1s ease-out both',
    }),
  ],
  crying: [
    (k) => ({
      eyes: hideBoth,
      parts: [
        k.eyeStroke(0, SHAPES.chevronL), k.eyeStroke(1, SHAPES.chevronR), k.mouth(wavy, 11 * k.s),
        ...([0, 1] as const).flatMap((i) => [0, 1].map((n) => k.icon(SHAPES.drop, k.eyes[i].cx + (i ? 1 : -1) * 3 * k.s, k.eyes[i].cy + 6 * k.s, 2.2, { fill: TEAR, anim: `aiav-drip .9s ${n * 0.45 + i * 0.2}s ease-in infinite` }))),
      ],
      blobs: [],
      motion: 'aiav-m-sob .5s ease-in-out infinite',
    }),
    (k) => ({
      eyes: [{ cut: -0.5, scale: [1, 0.85] }, { cut: -0.5, scale: [1, 0.85] }],
      parts: [
        k.mouth(oMouth, 6 * k.s, { fill: k.c.eyeLine }),
        ...([0, 1] as const).map((i): Part => ({
          layer: 'face', d: `M0 0V${+(100 - k.eyes[i].cy).toFixed(2)}`, stroke: TEAR, width: k.eyes[i].w * 0.45, opacity: 0.85,
          dash: [4, 4], at: { x: k.eyes[i].cx, y: k.eyes[i].cy + k.eyes[i].h * 0.3 }, anim: 'aiav-stream .6s linear infinite',
        })),
      ],
      blobs: [],
      motion: 'aiav-m-sob .45s ease-in-out infinite',
    }),
  ],
  angry: [
    (k) => ({
      eyes: [{ cut: 0.5 }, { cut: 0.5 }],
      parts: [k.mouth(frown, 10 * k.s), k.icon(SHAPES.vein, k.face.x + k.side * 17 * k.s, k.head.y + 3, 3.4, { stroke: ANGER, width: 0.32, anim: 'aiav-pulse .5s ease-in-out infinite' })],
      blobs: [{ x: k.face.x, y: k.face.y, w: 46 * k.s, h: 34 * k.s, color: 'rgb(255 60 60 / .35)', blur: 6 * k.s }],
      motion: 'aiav-m-shake .35s ease-in-out 3',
    }),
    (k) => ({
      eyes: [{ cut: 0.55, scale: [1.05, 0.75] }, { cut: 0.55, scale: [1.05, 0.75] }],
      parts: [
        k.mouth(teeth, 12 * k.s, { width: (k.stroke * 0.7) / (12 * k.s) }),
        ...[-1, 1].map((d) => k.icon(SHAPES.puff, k.face.x + d * 26 * k.s, k.head.y + 8, 3.5, { fill: 'rgb(255 255 255 / .85)', at: { x: k.face.x + d * 26 * k.s, y: k.head.y + 8, scale: 3.5 * k.s, rotate: d * 20 }, anim: `aiav-steam 1s ${d > 0 ? 0.3 : 0}s ease-out infinite` })),
      ],
      blobs: [{ x: k.face.x, y: k.face.y, w: 44 * k.s, h: 30 * k.s, color: 'rgb(255 70 70 / .3)', blur: 6 * k.s }],
      motion: 'aiav-m-shake .3s ease-in-out 4',
    }),
  ],
  sleepy: [
    (k) => ({
      eyes: hideBoth,
      parts: [k.eyeStroke(0, SHAPES.line), k.eyeStroke(1, SHAPES.line), k.mouth(oMouth, 3 * k.s), ...zzz(k)],
      blobs: [],
      motion: 'aiav-m-breathe 2.4s ease-in-out infinite',
    }),
    (k) => ({
      eyes: [{ scale: [1.05, 0.3], offset: [0, 2] }, { scale: [1.05, 0.3], offset: [0, 2] }],
      parts: [k.mouth(smile, 6 * k.s), ...zzz(k)],
      blobs: [],
      motion: 'aiav-m-breathe 2.4s ease-in-out infinite',
    }),
  ],
  dizzy: [
    (k) => ({
      eyes: hideBoth,
      parts: [k.eyeStroke(0, SHAPES.x), k.eyeStroke(1, SHAPES.x), k.mouth(wavy, 11 * k.s), ...orbit(k)],
      blobs: [],
      motion: 'aiav-m-sway 1.2s ease-in-out infinite',
    }),
    (k) => ({
      eyes: hideBoth,
      parts: [
        k.eyeStroke(0, SHAPES.spiral, { anim: 'aiav-spin 1s linear infinite' }),
        k.eyeStroke(1, SHAPES.spiral, { anim: 'aiav-spin 1s linear infinite' }),
        k.mouth(wavy, 10 * k.s),
      ],
      blobs: [],
      motion: 'aiav-m-sway 1.4s ease-in-out infinite',
    }),
  ],
  thinking: [
    (k) => ({
      eyes: [{ offset: [k.side * 2.5 * k.s, -2.5 * k.s] }, { offset: [k.side * 2.5 * k.s, -2.5 * k.s], scale: [1, 0.75] }],
      parts: [
        k.mouth('M-0.5 0.05H0.2', 8 * k.s),
        ...[0, 1, 2].map((n) => k.icon(SHAPES.dot, k.face.x + k.side * (14 + n * 5) * k.s, k.head.y + 2 - n * 2, 1.4, { stroke: k.ink, width: 2.6, anim: `aiav-dot 1.2s ${n * 0.2}s ease-in-out infinite` })),
      ],
      blobs: [],
      motion: 'aiav-m-tilt 3s ease-in-out both',
    }),
    (k) => ({
      eyes: [{ offset: [-k.side * 2 * k.s, -2.5 * k.s] }, { offset: [-k.side * 2 * k.s, -2.5 * k.s] }],
      parts: [k.mouth(smirk, 8 * k.s), k.icon(SHAPES.question, k.face.x + k.side * 17 * k.s, k.head.y, 5, { stroke: GOLD, width: 0.3, anim: 'aiav-pop .4s cubic-bezier(.3,1.6,.5,1) both, aiav-bob 1.4s .4s ease-in-out infinite' })],
      blobs: [],
    }),
  ],
};

function blush(k: Kit): Blob[] {
  return ([0, 1] as const).map((i) => ({
    x: k.eyes[i].cx + (i ? 1 : -1) * 3 * k.s, y: k.eyes[i].cy + k.eyes[i].h * 0.55,
    w: 11 * k.s, h: 5.5 * k.s, color: 'rgb(255 110 150 / .55)', blur: 2 * k.s,
  }));
}

function sweat(k: Kit, delay: number, flip = 1): Part {
  const i = (k.side * flip > 0 ? 1 : 0) as 0 | 1;
  return k.icon(SHAPES.drop, k.outer(i) + (i ? 1 : -1) * 2 * k.s, k.eyes[i].cy - k.eyes[i].h * 0.55, 3.2, { fill: TEAR, anim: `aiav-pop .3s ${delay}s both, aiav-slide 1.4s ${delay + 0.3}s ease-in infinite` });
}

function zzz(k: Kit): Part[] {
  return [0, 1, 2].map((n) =>
    k.icon(SHAPES.z, k.face.x + k.side * (12 + n * 5) * k.s, k.head.y + 4 - n * 4.5, 2.8 + n * 0.7, {
      stroke: k.ink, width: 0.3, anim: `aiav-rise 2.4s ${n * 0.6}s ease-out infinite`,
    }),
  );
}

function orbit(k: Kit): Part[] {
  const cx = k.face.x;
  const cy = k.head.y + 3;
  return [0, 1, 2].map((n) => {
    const a = (n / 3) * Math.PI * 2;
    return k.icon(SHAPES.star, cx + Math.cos(a) * 13 * k.s, cy + Math.sin(a) * 3.5 * k.s, 2.2, {
      fill: GOLD, origin: [cx, cy], anim: 'aiav-orbit 1.6s linear infinite',
    });
  });
}

export function variantCount(name: EmotionName): number {
  return VARIANTS[name].length;
}

/** `seedKey` picks the variant and its small details. */
export function buildEmotion(name: EmotionName, ctx: Omit<EmotionContext, 'rnd'>, seedKey: string, variant?: number): EmotionFrame {
  const rnd = rngFromSeed(`${seedKey}:${name}`);
  const list = VARIANTS[name];
  const v = variant != null ? ((variant % list.length) + list.length) % list.length : Math.floor(rnd() * list.length);
  return { name, variant: v, ...list[v]!(kit({ ...ctx, rnd })) };
}

export const EMOTION_KEYFRAMES =
  '@keyframes aiav-fade{from{opacity:0}to{opacity:1}}' +
  '@keyframes aiav-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}' +
  '@keyframes aiav-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}' +
  '@keyframes aiav-twinkle{0%,100%{transform:scale(.6) rotate(0);opacity:.6}50%{transform:scale(1.1) rotate(45deg);opacity:1}}' +
  '@keyframes aiav-rise{0%{transform:translateY(4px) scale(.5);opacity:0}20%{opacity:1}100%{transform:translateY(-10px) scale(1);opacity:0}}' +
  '@keyframes aiav-drip{0%{transform:translateY(-2px) scale(.4);opacity:0}25%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(12px);opacity:0}}' +
  '@keyframes aiav-slide{0%,20%{transform:translateY(0);opacity:1}100%{transform:translateY(8px);opacity:0}}' +
  '@keyframes aiav-stream{from{stroke-dashoffset:0}to{stroke-dashoffset:-8}}' +
  '@keyframes aiav-spin{to{transform:rotate(360deg)}}' +
  '@keyframes aiav-orbit{to{transform:rotate(360deg)}}' +
  '@keyframes aiav-dot{0%,100%{opacity:.25}50%{opacity:1}}' +
  '@keyframes aiav-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}' +
  '@keyframes aiav-quiver{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.88)}}' +
  '@keyframes aiav-steam{0%{transform:translateY(2px) scale(.4);opacity:0}30%{opacity:1}100%{transform:translateY(-6px) scale(1.2);opacity:0}}' +
  '@keyframes aiav-m-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-5%)}70%{transform:translateY(1%)}}' +
  '@keyframes aiav-m-giggle{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2%)}}' +
  '@keyframes aiav-m-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}' +
  '@keyframes aiav-m-pop{0%{transform:scale(1)}40%{transform:scale(1.07) translateY(-3%)}100%{transform:scale(1)}}' +
  '@keyframes aiav-m-tremble{0%,100%{transform:translateX(0)}25%{transform:translateX(-.7%)}75%{transform:translateX(.7%)}}' +
  '@keyframes aiav-m-shake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-2%) rotate(-2deg)}75%{transform:translateX(2%) rotate(2deg)}}' +
  '@keyframes aiav-m-droop{to{transform:translateY(2.5%) rotate(-2deg)}}' +
  '@keyframes aiav-m-sob{0%,100%{transform:translateY(0)}50%{transform:translateY(1.2%)}}' +
  '@keyframes aiav-m-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(1%) scaleY(.985)}}' +
  '@keyframes aiav-m-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}' +
  '@keyframes aiav-m-tilt{0%{transform:rotate(0)}30%,80%{transform:rotate(-5deg)}100%{transform:rotate(-5deg)}}';

// extends half a box past every edge so the eye's outline and glow survive the clip
export function cutPolygon(cut: number | undefined, left: boolean): [number, number][] {
  const t = Math.abs(cut ?? 0);
  if (!t) return [[-0.5, -0.5], [1.5, -0.5], [1.5, 1.5], [-0.5, 1.5]];
  const rightDown = left === (cut! > 0);
  const top: [number, number][] = rightDown ? [[-0.5, -0.5 * t], [1.5, 1.5 * t]] : [[-0.5, 1.5 * t], [1.5, -0.5 * t]];
  return [...top, [1.5, 1.5], [-0.5, 1.5]];
}

export function partTransform(at: Part['at']): string | undefined {
  if (!at) return undefined;
  const r = at.rotate ? ` rotate(${+at.rotate.toFixed(2)})` : '';
  const k = at.scale != null && at.scale !== 1 ? ` scale(${+at.scale.toFixed(3)})` : '';
  return `translate(${+at.x.toFixed(3)} ${+at.y.toFixed(3)})${r}${k}`;
}

export function playTime(emotion: EmotionInput, duration?: number) {
  const name = emotionName(emotion);
  return duration ?? (name ? EMOTION_DURATION[name] : 2500);
}
