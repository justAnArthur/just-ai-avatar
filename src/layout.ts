import type { Colors } from './colors.ts';
import { type AvatarOptions, type Resolved, resolve } from './options.ts';
import { BODIES, type BodyDef, type Box, EYES, type EyeDef, type Shape, TILES } from './shapes.ts';

export interface EyeLayout {
  def: EyeDef;
  /** Eye box in tile units (0–100); it rotates around its own center. */
  box: Box;
  rotate: number;
}

/**
 * Geometry shared by the HTML component and the SVG renderer.
 * Every length is in tile units: the tile is 100×100, so 1 unit = 1% = 1cqw.
 */
export interface Layout {
  options: Resolved;
  colors: Colors;
  /** CSS border-radius of the tile. */
  tileRadius: string;
  hasBackground: boolean;
  body: Box & { shape: Shape };
  core: Box & { shape: Shape };
  shade: Box;
  eyes: [EyeLayout, EyeLayout];
  /** Blur standard deviations, in tile units. */
  blur: { core: number; shade: number; glow: number };
  /** Multiplier for eye outline / glow sizes. */
  scale: number;
}

export function layout(input: AvatarOptions = {}): Layout {
  const o = resolve(input);
  const B: BodyDef = BODIES[o.body];
  const s = B.scale;
  const { box } = B;
  const inBody = (bx: number, by: number) => [box.x + (bx * box.w) / 100, box.y + (by * box.h) / 100] as const;

  const [fx, fy] = inBody(B.face.x, B.face.y);

  const coreW = (B.core.w * box.w) / 100;
  const coreH = (B.core.h * box.h) / 100;
  const [ccx, ccy] = inBody(B.core.cx, B.core.cy);

  const shadeW = 39.8 * s;
  const shadeH = 30.9 * s;

  const half = 13 * o.spacing * s;
  const t = (o.tilt * Math.PI) / 180;
  const eyes = ([-1, 1] as const).map((side, i): EyeLayout => {
    const def: EyeDef = EYES[o.eyes[i]!];
    const w = def.w * s * o.eyeScale;
    const h = def.h * s * o.eyeScale;
    const cx = fx + side * half * Math.cos(t) + o.gazeX * 4 * s;
    const cy = fy - side * half * Math.sin(t) + o.gazeY * 3 * s;
    return { def, box: { x: cx - w / 2, y: cy - h * (def.arc ? 0.3 : 0.5), w, h }, rotate: -o.tilt };
  }) as [EyeLayout, EyeLayout];

  return {
    options: o,
    colors: o.colors,
    tileRadius: TILES[o.tile as keyof typeof TILES] ?? o.tile,
    hasBackground: o.tile !== 'none',
    body: { ...box, shape: B.shape },
    core: { x: ccx - coreW / 2, y: ccy - coreH / 2, w: coreW, h: coreH, shape: B.core.shape ?? B.shape },
    shade: { x: fx - shadeW / 2, y: fy - shadeH / 2, w: shadeW, h: shadeH },
    eyes,
    blur: { core: 6.5 * s, shade: 5 * s, glow: 0.7 },
    scale: s,
  };
}
