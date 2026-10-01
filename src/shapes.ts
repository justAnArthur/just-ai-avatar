export type Box = { x: number; y: number; w: number; h: number };

/** CSS border-radius, or polygon points in % of the box with rounded corners. */
export type Shape = { radius: string } | { points: [number, number][]; round: number };

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
  },
  diamond: {
    box: { x: -6, y: 28, w: 112, h: 112 },
    shape: { points: [[50, 0], [100, 50], [50, 100], [0, 50]], round: 14 },
    core: { cx: 50, cy: 50, w: 80, h: 80, shape: { points: [[50, 0], [100, 50], [50, 100], [0, 50]], round: 12 } },
    face: { x: 52, y: 38 },
    scale: 0.9,
  },
  hexagon: {
    box: { x: -4, y: 22, w: 108, h: 112 },
    shape: { points: [[50, 0], [100, 24], [100, 76], [50, 100], [0, 76], [0, 24]], round: 10 },
    core: { cx: 50, cy: 50, w: 72, h: 70, shape: { points: [[50, 0], [100, 24], [100, 76], [50, 100], [0, 76], [0, 24]], round: 10 } },
    face: { x: 53, y: 34 },
    scale: 0.92,
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

type Pt = readonly [number, number];

/** Each corner becomes a quadratic Bézier s→e around p; `round` uses `w`/`h` units so corners stay circular. */
export function polygonCorners(points: [number, number][], w: number, h: number, round: number) {
  const P = points.map(([x, y]) => [(x * w) / 100, (y * h) / 100] as const);
  const n = P.length;
  return P.map((p, i) => {
    const a = P[(i - 1 + n) % n]!;
    const b = P[(i + 1) % n]!;
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const t = Math.min(round, da / 2, db / 2);
    const s: Pt = [p[0] + ((a[0] - p[0]) / da) * t, p[1] + ((a[1] - p[1]) / da) * t];
    const e: Pt = [p[0] + ((b[0] - p[0]) / db) * t, p[1] + ((b[1] - p[1]) / db) * t];
    return { s, p, e };
  });
}

export function roundedPolygon(points: [number, number][], w: number, h: number, round: number, steps = 6): string {
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

export function shapeStyle(shape: Shape, w: number, h: number): { borderRadius?: string; clipPath?: string } {
  return 'radius' in shape ? { borderRadius: shape.radius } : { clipPath: roundedPolygon(shape.points, w, h, shape.round) };
}
