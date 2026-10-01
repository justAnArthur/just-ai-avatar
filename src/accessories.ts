import type { EyeBox, Part } from './emotions.ts';
import type { Role } from './looks.ts';
import { circlePath, radiusPath } from './shapes.ts';

/** Tile units; `at` places a piece drawn in its own units, like emotion parts. */
export type Piece = { d: string; role: Role; at?: Part['at']; width?: number; evenodd?: boolean };

export type Anchors = {
  s: number;
  tilt: number;
  face: { x: number; y: number };
  crown: { x: number; y: number };
  eyes: [EyeBox, EyeBox];
};

type AccessoryDef = {
  slot: 'head' | 'face';
  /** How far it reaches above the crown in its own units; the body moves down to fit it in the tile. */
  rise: number;
  build: (a: Anchors) => Piece[];
};

type Local = Omit<Piece, 'at'>;

const c = circlePath;
const rect = (x: number, y: number, w: number, h: number, r: number) => radiusPath(`${r}px`, { x, y, w, h });

// hats are drawn small and scaled up, y grows down, tilted a bit less than the eyes
const HAT = 1.5;

function onHead(a: Anchors, pieces: Local[], { dx = 0, dy = 0, rotate = 0 } = {}): Piece[] {
  const k = a.s * HAT;
  const at = { x: a.crown.x + dx * k, y: a.crown.y + dy * k, scale: k, rotate: -a.tilt * 0.6 + rotate };
  return pieces.map((p) => ({ ...p, at }));
}

function eyePair(a: Anchors) {
  const [l, r] = a.eyes;
  const gap = Math.hypot(r.cx - l.cx, r.cy - l.cy);
  return { l, r, gap, rot: -a.tilt, spin: (x: number, y: number) => rotate(x, y, -a.tilt) };
}

function rotate(x: number, y: number, deg: number): [number, number] {
  const t = (deg * Math.PI) / 180;
  return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
}

const n = (v: number) => +v.toFixed(3);

export const ACCESSORIES = {
  beret: {
    slot: 'head',
    rise: 15,
    build: (a) => onHead(a, [
      { d: 'M-18 3C-20-4-12-11 1-11.5C13-12 20-6 18.5 1C17 4.5-15 5.5-18 3Z', role: 'fill' },
      { d: c(1.5, -12.3, 2.3), role: 'fill' },
    ], { dx: -2, rotate: -8 }),
  },
  beanie: {
    slot: 'head',
    rise: 22,
    build: (a) => onHead(a, [
      { d: 'M-17 4C-17-9-9-15.5 0-15.5S17-9 17 4Z', role: 'fill' },
      { d: rect(-18.5, 0, 37, 7.5, 3.5), role: 'trim' },
      { d: c(0, -16.5, 4.4), role: 'trim' },
    ], { dy: 1 }),
  },
  cap: {
    slot: 'head',
    rise: 15,
    build: (a) => onHead(a, [
      { d: 'M6 1C13-1.5 23-0.5 27 3C23 6 12 6.5 6 4.5Z', role: 'trim' },
      { d: 'M-15 4C-15-8-8-13.5 0-13.5S15-8 15 4Z', role: 'fill' },
      { d: c(0, -13.6, 1.8), role: 'trim' },
    ], { dy: 1 }),
  },
  crown: {
    slot: 'head',
    rise: 17,
    build: (a) => onHead(a, [
      { d: 'M-13 3L-15-10L-7-3.5L0-13L7-3.5L15-10L13 3Z', role: 'gold' },
      { d: c(-15, -11, 1.8), role: 'gold' },
      { d: c(0, -14, 1.8), role: 'gold' },
      { d: c(15, -11, 1.8), role: 'gold' },
      { d: c(0, -0.5, 2), role: 'fill' },
      { d: c(-8, 0, 1.4), role: 'fill' },
      { d: c(8, 0, 1.4), role: 'fill' },
    ], { dy: 1 }),
  },
  halo: {
    slot: 'head',
    rise: 17,
    build: (a) => onHead(a, [{ d: c(0, -11, 13, 3.8) + c(0, -11, 9.5, 2.1), role: 'gold', evenodd: true }]),
  },
  antenna: {
    slot: 'head',
    rise: 21,
    build: (a) => onHead(a, [
      { d: 'M0 3V-13', role: 'frame', width: 1.8 },
      { d: c(0, -16, 3.8), role: 'fill' },
      { d: c(-1.2, -17.3, 1.1), role: 'shine' },
    ]),
  },
  sprout: {
    slot: 'head',
    rise: 19,
    build: (a) => onHead(a, [
      { d: 'M0 3C0-3-1-7 0-11', role: 'leaf', width: 1.8 },
      { d: 'M0-10.5C-3-15.5-10-16-12.5-12C-9.5-8.5-3.5-8.5 0-10.5Z', role: 'leaf' },
      { d: 'M0-11.5C2-17.5 9-19 12.5-16C10.5-11.5 4-10.5 0-11.5Z', role: 'leaf' },
    ]),
  },
  bow: {
    slot: 'head',
    rise: 10,
    build: (a) => onHead(a, [
      { d: 'M0 0C-4-6-11.5-7-11.5-1S-4 4.5 0 0Z', role: 'fill' },
      { d: 'M0 0C4-6 11.5-7 11.5-1S4 4.5 0 0Z', role: 'fill' },
      { d: c(0, -0.5, 2.6), role: 'fill' },
    ], { dx: 11, dy: 3, rotate: 14 }),
  },
  headphones: {
    slot: 'head',
    rise: 4,
    build: (a) => {
      const { l, r, gap } = eyePair(a);
      const out = gap / 2 + Math.max(l.w, r.w) / 2 + 7.5 * a.s;
      const cx = (l.cx + r.cx) / 2;
      const cy = (l.cy + r.cy) / 2 + 1.5 * a.s;
      const top = a.crown.y - 9 * a.s;
      const [w, h] = [8.5 * a.s, 15 * a.s];
      return [
        { d: `M${n(cx - out)} ${n(cy - h / 3)}C${n(cx - out)} ${n(top)} ${n(cx + out)} ${n(top)} ${n(cx + out)} ${n(cy - h / 3)}`, role: 'frame', width: 2.6 * a.s },
        ...[-1, 1].flatMap((side) => {
          const x = cx + side * out;
          return [
            { d: rect(x - w / 2, cy - h / 2, w, h, 3.8 * a.s), role: 'fill' as const },
            { d: rect(x - side * w * 0.5 - (side < 0 ? 0 : 2 * a.s), cy - h * 0.34, 2 * a.s, h * 0.68, a.s), role: 'trim' as const },
          ];
        }),
      ];
    },
  },
  glasses: {
    slot: 'face',
    rise: 0,
    build: (a) => {
      const { l, r, gap, rot, spin } = eyePair(a);
      const rx = Math.min(Math.max(l.w, r.w) * 0.78, gap * 0.45);
      const ry = Math.max(l.h, r.h) * 0.62;
      const width = 2 * a.s;
      const lens = (e: EyeBox): Piece[] => [
        { d: c(0, 0, rx, ry), role: 'glass', at: { x: e.cx, y: e.cy, rotate: rot } },
        { d: c(0, 0, rx, ry), role: 'frame', width, at: { x: e.cx, y: e.cy, rotate: rot } },
      ];
      const [bx, by] = spin(rx, 0);
      const lift = spin(0, -ry * 0.25 - 2 * a.s);
      const mx = (l.cx + r.cx) / 2 + lift[0];
      const my = (l.cy + r.cy) / 2 + lift[1];
      const [tx, ty] = spin(rx + 5 * a.s, -ry * 0.25);
      return [
        ...lens(l), ...lens(r),
        { d: `M${n(l.cx + bx)} ${n(l.cy + by)}Q${n(mx)} ${n(my)} ${n(r.cx - bx)} ${n(r.cy - by)}`, role: 'frame', width },
        { d: `M${n(l.cx - bx)} ${n(l.cy - by)}L${n(l.cx - tx)} ${n(l.cy - ty)}M${n(r.cx + bx)} ${n(r.cy + by)}L${n(r.cx + tx)} ${n(r.cy + ty)}`, role: 'frame', width },
      ];
    },
  },
  shades: {
    slot: 'face',
    rise: 0,
    build: (a) => {
      const { l, r, gap, rot, spin } = eyePair(a);
      const rx = Math.min(Math.max(l.w, r.w) * 0.85, gap * 0.48);
      const ry = Math.max(l.h, r.h) * 0.62;
      const top = -ry * 0.92;
      const lens = `M${n(-rx)} ${n(top)}H${n(rx)}C${n(rx)} ${n(ry * 0.65)} ${n(rx * 0.5)} ${n(ry * 1.05)} 0 ${n(ry * 1.05)}C${n(-rx * 0.5)} ${n(ry * 1.05)} ${n(-rx)} ${n(ry * 0.65)} ${n(-rx)} ${n(top)}Z`;
      const shine = `M${n(-rx * 0.55)} ${n(top * 0.45)}L${n(-rx * 0.15)} ${n(top * 0.7)}L${n(-rx * 0.05)} ${n(top * 0.4)}L${n(-rx * 0.5)} ${n(top * 0.08)}Z`;
      const [lx, ly] = spin(rx - a.s, top + a.s);
      const [rx2, ry2] = spin(-rx + a.s, top + a.s);
      return [
        ...[l, r].flatMap((e): Piece[] => [
          { d: lens, role: 'lens', at: { x: e.cx, y: e.cy, rotate: rot } },
          { d: shine, role: 'shine', at: { x: e.cx, y: e.cy, rotate: rot } },
        ]),
        { d: `M${n(l.cx + lx)} ${n(l.cy + ly)}L${n(r.cx + rx2)} ${n(r.cy + ry2)}`, role: 'frame', width: 2.4 * a.s },
      ];
    },
  },
} satisfies Record<string, AccessoryDef>;

export type AccessoryName = keyof typeof ACCESSORIES;

const ALL = ACCESSORIES as Record<AccessoryName, AccessoryDef>;

export const HEAD_ACCESSORIES = (Object.keys(ALL) as AccessoryName[]).filter((k) => ALL[k].slot === 'head');
export const FACE_ACCESSORIES = (Object.keys(ALL) as AccessoryName[]).filter((k) => ALL[k].slot === 'face');

/** One per slot, the later wins; unknown names are dropped. */
export function pickAccessories(input: AccessoryName | AccessoryName[] | undefined): AccessoryName[] {
  const bySlot = new Map<string, AccessoryName>();
  for (const name of [input ?? []].flat()) if (name in ALL) bySlot.set(ALL[name].slot, name);
  return [...bySlot.values()];
}

/** Tile units above the crown at body scale 1. */
export function accessoryRise(names: AccessoryName[]): number {
  return Math.max(0, ...names.map((name) => ALL[name].rise * (ALL[name].slot === 'head' ? HAT : 1)));
}

export function placeAccessories(names: AccessoryName[], a: Anchors): Record<'head' | 'face', Piece[]> {
  const placed = { head: [] as Piece[], face: [] as Piece[] };
  for (const name of names) placed[ALL[name].slot].push(...ALL[name].build(a));
  return placed;
}
