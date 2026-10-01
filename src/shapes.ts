export type Box = { x: number; y: number; w: number; h: number };

/**
 * CSS border-radius; polygon points in % of the box with rounded corners (one round, or one per corner);
 * or a union of circles `[cx, cy, r]`, with cx/r in % of the box width and cy in % of its height.
 */
export type Shape =
  | { radius: string }
  | { points: [number, number][]; round: number | number[] }
  | { lobes: [number, number, number][] };

export type BodyDef = {
  /** % of the tile; must overflow it so the tile crops the body. */
  box: Box;
  shape: Shape;
  /** Glow center and size in % of the body box. */
  core: { cx: number; cy: number; w: number; h: number; shape?: Shape };
  /** Point between the eyes, % of the body box. */
  face: { x: number; y: number };
  /** Relative to the original dome. */
  scale: number;
  /** Top of the head, where hats sit, % of the body box; the top center by default. */
  crown?: { x: number; y: number };
};

export const BODIES = {
  dome: {
    box: { x: -5.25, y: 26, w: 110.5, h: 110.5 },
    shape: { radius: '50%' },
    core: { cx: 49.8, cy: 41.1, w: 72, h: 60 },
    face: { x: 54.65, y: 29.65 },
    scale: 1,
  },
  peek: {
    box: { x: -15, y: 50, w: 130, h: 130 },
    shape: { radius: '50%' },
    core: { cx: 50, cy: 40, w: 70, h: 56 },
    face: { x: 54, y: 21 },
    scale: 1.1,
  },
  wide: {
    box: { x: -22, y: 30, w: 144, h: 100 },
    shape: { radius: '50%' },
    core: { cx: 50, cy: 44, w: 72, h: 60 },
    face: { x: 53, y: 30 },
    scale: 0.95,
  },
  arch: {
    box: { x: 9, y: 22, w: 82, h: 100 },
    shape: { radius: '50% 50% 0 0 / 41% 41% 0 0' },
    core: { cx: 50, cy: 50, w: 64, h: 72, shape: { radius: '50% 50% 18% 18% / 38% 38% 18% 18%' } },
    face: { x: 53, y: 33 },
    scale: 0.85,
  },
  square: {
    box: { x: 8, y: 26, w: 84, h: 90 },
    shape: { radius: '20% / 18.7%' },
    core: { cx: 50, cy: 52, w: 68, h: 68, shape: { radius: '28%' } },
    face: { x: 53, y: 34 },
    scale: 0.85,
  },
  triangle: {
    box: { x: -32, y: 12, w: 164, h: 116 },
    shape: { points: [[50, 0], [100, 100], [0, 100]], round: 18 },
    core: { cx: 50, cy: 62, w: 78, h: 70, shape: { points: [[50, 0], [100, 100], [0, 100]], round: 16 } },
    face: { x: 52, y: 52 },
    scale: 0.9,
    crown: { x: 50, y: 6 },
  },
  diamond: {
    box: { x: -6, y: 28, w: 112, h: 112 },
    shape: { points: [[50, 0], [100, 50], [50, 100], [0, 50]], round: 14 },
    core: { cx: 50, cy: 50, w: 80, h: 80, shape: { points: [[50, 0], [100, 50], [50, 100], [0, 50]], round: 12 } },
    face: { x: 52, y: 38 },
    scale: 0.9,
    crown: { x: 50, y: 4.5 },
  },
  hexagon: {
    box: { x: -4, y: 22, w: 108, h: 112 },
    shape: { points: [[50, 0], [100, 24], [100, 76], [50, 100], [0, 76], [0, 24]], round: 10 },
    core: { cx: 50, cy: 50, w: 72, h: 70, shape: { points: [[50, 0], [100, 24], [100, 76], [50, 100], [0, 76], [0, 24]], round: 10 } },
    face: { x: 53, y: 34 },
    scale: 0.92,
    crown: { x: 50, y: 2 },
  },
  cloud: {
    box: { x: -14, y: 21, w: 130, h: 131 },
    shape: { lobes: [[27.69, 28.24, 15.38], [50.77, 19.08, 19.23], [72.31, 26.72, 16.15], [49.23, 60.31, 40], [15.38, 49.62, 15.38], [84.62, 48.09, 15.38]] },
    core: { cx: 50, cy: 35, w: 75, h: 55, shape: { radius: '50%' } },
    face: { x: 52.3, y: 28.2 },
    scale: 0.9,
    crown: { x: 50.77, y: 0 },
  },
  drop: {
    box: { x: 4, y: 8, w: 92, h: 112 },
    shape: { points: [[50, 0], [100, 62], [50, 100], [0, 62]], round: [3, 40, 60, 40] },
    core: { cx: 50, cy: 62, w: 74, h: 62, shape: { radius: '50%' } },
    face: { x: 52.2, y: 50 },
    scale: 0.85,
    crown: { x: 50, y: 1.5 },
  },
  bean: {
    box: { x: -12, y: 32, w: 124, h: 92 },
    shape: { radius: '40% / 48%' },
    core: { cx: 50, cy: 45, w: 76, h: 62 },
    face: { x: 53.2, y: 32.6 },
    scale: 0.95,
  },
} satisfies Record<string, BodyDef>;

export type BodyName = keyof typeof BODIES;

export type EyeDef = {
  w: number;
  h: number;
  radius?: string;
  /** Top half of a ring: a closed, smiling eye. */
  arc?: boolean;
};

/** Sizes in % of the tile on the original dome. */
export const EYES = {
  oval: { w: 17.3, h: 22.9 },
  round: { w: 18, h: 18 },
  tall: { w: 12.5, h: 25 },
  dot: { w: 9, h: 10.5 },
  square: { w: 16, h: 19, radius: '28%' },
  pill: { w: 19, h: 7, radius: '999px' },
  happy: { w: 22, h: 22, arc: true },
} satisfies Record<string, EyeDef>;

export type EyeName = keyof typeof EYES;

export const EYE_PAIRS = {
  wink: ['oval', 'happy'],
} satisfies Record<string, [EyeName, EyeName]>;

export type EyePairName = keyof typeof EYE_PAIRS;

export const TILES = {
  squircle: '24%',
  rounded: '14%',
  circle: '50%',
  square: '0',
  none: '0',
} as const;

export type TileName = keyof typeof TILES;

const f = (n: number) => +n.toFixed(2);
const n3 = (v: number) => +v.toFixed(3);

type Pt = readonly [number, number];

/** Each corner becomes a quadratic Bézier s→e around p; `round` uses `w`/`h` units so corners stay circular. */
export function polygonCorners(points: [number, number][], w: number, h: number, round: number | number[]) {
  const P = points.map(([x, y]) => [(x * w) / 100, (y * h) / 100] as const);
  const n = P.length;
  return P.map((p, i) => {
    const a = P[(i - 1 + n) % n]!;
    const b = P[(i + 1) % n]!;
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const t = Math.min(typeof round === 'number' ? round : round[i]!, da / 2, db / 2);
    const s: Pt = [p[0] + ((a[0] - p[0]) / da) * t, p[1] + ((a[1] - p[1]) / da) * t];
    const e: Pt = [p[0] + ((b[0] - p[0]) / db) * t, p[1] + ((b[1] - p[1]) / db) * t];
    return { s, p, e };
  });
}

export function roundedPolygon(points: [number, number][], w: number, h: number, round: number | number[], steps = 6): string {
  const out: string[] = [];
  for (const { s, p, e } of polygonCorners(points, w, h, round)) {
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const x = (1 - u) ** 2 * s[0] + 2 * (1 - u) * u * p[0] + u ** 2 * e[0];
      const y = (1 - u) ** 2 * s[1] + 2 * (1 - u) * u * p[1] + u ** 2 * e[1];
      out.push(`${f((x / w) * 100)}% ${f((y / h) * 100)}%`);
    }
  }
  return `polygon(${out.join(',')})`;
}

export function shapeStyle(shape: Shape, w: number, h: number): { borderRadius?: string; clipPath?: string; maskImage?: string } {
  if ('radius' in shape) return { borderRadius: shape.radius };
  if ('points' in shape) return { clipPath: roundedPolygon(shape.points, w, h, shape.round) };
  // stacked mask layers add up, so the circles union; cqw because gradient circles take no %
  const circle = ([cx, cy, r]: [number, number, number]) => {
    const R = `${f((r * w) / 100)}cqw`;
    return `radial-gradient(circle at ${cx}% ${cy}%,#000 calc(${R} - .4px),transparent calc(${R} + .4px))`;
  };
  return { maskImage: shape.lobes.map(circle).join(',') };
}

/** SVG path of a CSS border-radius (`a b c d / e f g h`, % and px). */
export function radiusPath(radius: string, b: Box): string {
  const [hPart, vPart] = radius.split('/').map((p) => p.trim().split(/\s+/));
  const expand = (v: string[]) => {
    const [a = '0', c = a, d = a, e = c] = v;
    return [a, c, d, e];
  };
  const len = (v: string, dim: number) => (v.endsWith('%') ? (parseFloat(v) / 100) * dim : parseFloat(v) || 0);
  let H = expand(hPart!).map((v) => len(v, b.w));
  let V = expand(vPart ?? hPart!).map((v) => len(v, b.h));
  // css shrinks every radius when adjacent ones overlap
  const ratio = (side: number, a: number, c: number) => (a + c > 0 ? side / (a + c) : Infinity);
  const k = Math.min(1, ratio(b.w, H[0]!, H[1]!), ratio(b.w, H[3]!, H[2]!), ratio(b.h, V[0]!, V[3]!), ratio(b.h, V[1]!, V[2]!));
  H = H.map((v) => v * k);
  V = V.map((v) => v * k);
  const [tlh, trh, brh, blh] = H as [number, number, number, number];
  const [tlv, trv, brv, blv] = V as [number, number, number, number];
  const { x, y, w, h } = b;
  const arc = (rx: number, ry: number, ex: number, ey: number) => (rx && ry ? `A${n3(rx)} ${n3(ry)} 0 0 1 ${n3(ex)} ${n3(ey)}` : `L${n3(ex)} ${n3(ey)}`);
  return [
    `M${n3(x + tlh)} ${n3(y)}`,
    `H${n3(x + w - trh)}`,
    arc(trh, trv, x + w, y + trv),
    `V${n3(y + h - brv)}`,
    arc(brh, brv, x + w - brh, y + h),
    `H${n3(x + blh)}`,
    arc(blh, blv, x, y + h - blv),
    `V${n3(y + tlv)}`,
    arc(tlh, tlv, x + tlh, y),
    'Z',
  ].join('');
}

export function circlePath(cx: number, cy: number, r: number, ry = r): string {
  return `M${n3(cx - r)} ${n3(cy)}a${n3(r)} ${n3(ry)} 0 1 0 ${n3(2 * r)} 0a${n3(r)} ${n3(ry)} 0 1 0 ${n3(-2 * r)} 0Z`;
}

export function shapePath(shape: Shape, b: Box): string {
  if ('radius' in shape) return radiusPath(shape.radius, b);
  if ('lobes' in shape) return shape.lobes.map(([cx, cy, r]) => circlePath(b.x + (cx * b.w) / 100, b.y + (cy * b.h) / 100, (r * b.w) / 100)).join('');
  const at = ([px, py]: readonly [number, number]) => `${n3(b.x + px)} ${n3(b.y + py)}`;
  return `${polygonCorners(shape.points, b.w, b.h, shape.round)
    .map(({ s, p, e }, i) => `${i ? 'L' : 'M'}${at(s)}Q${at(p)} ${at(e)}`)
    .join('')}Z`;
}
