import { type Anchors, type Piece, accessoryRise, placeAccessories } from './accessories.ts';
import type { Colors } from './colors.ts';
import { type EmotionFrame, type EyeMod, buildEmotion, emotionName } from './emotions.ts';
import { type Paint, lookPaint, ok } from './looks.ts';
import { type AvatarOptions, type Resolved, resolve } from './options.ts';
import { BODIES, type BodyDef, type Box, EYES, type EyeDef, type Shape, TILES } from './shapes.ts';

export type EyeLayout = {
  def: EyeDef;
  /** Rotates around its own center. */
  box: Box;
  rotate: number;
  mod: EyeMod;
};

/** Geometry shared by the HTML and SVG renderers, in tile units: the tile is 100×100, 1 unit = 1cqw. */
export type Layout = {
  options: Resolved;
  colors: Colors;
  paint: Paint;
  tileRadius: string;
  hasBackground: boolean;
  body: Box & { shape: Shape };
  core: Box & { shape: Shape };
  shade: Box;
  face: { x: number; y: number };
  eyes: [EyeLayout, EyeLayout];
  accessories: Record<'head' | 'face', Piece[]>;
  /** Standard deviations. */
  blur: { core: number; shade: number; glow: number };
  scale: number;
  emotion: EmotionFrame | null;
};

export function layout(input: AvatarOptions = {}): Layout {
  const o = resolve(input);
  const B: BodyDef = BODIES[o.body];
  const s = B.scale;
  const crown = B.crown ?? { x: 50, y: 0 };

  // a hat needs room above the head; bodies overflow the bottom, so moving them down keeps the crop
  const crownY = B.box.y + (crown.y * B.box.h) / 100;
  const rise = accessoryRise(o.accessories) * s;
  const box = { ...B.box, y: B.box.y + (rise ? Math.max(0, rise + 2 - crownY) : 0) };
  const inBody = (x: number, y: number) => [box.x + (x * box.w) / 100, box.y + (y * box.h) / 100] as const;

  const [fx, fy] = inBody(B.face.x, B.face.y);
  const [ccx, ccy] = inBody(B.core.cx, B.core.cy);
  const [crx, cry] = inBody(crown.x, crown.y);
  const coreW = (B.core.w * box.w) / 100;
  const coreH = (B.core.h * box.h) / 100;
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
    return { def, box: { x: cx - w / 2, y: cy - h * (def.arc ? 0.3 : 0.5), w, h }, rotate: -o.tilt, mod: {} };
  }) as [EyeLayout, EyeLayout];
  const eyeBoxes = eyes.map(({ box: b }) => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: b.w, h: b.h })) as Anchors['eyes'];

  const glow = o.look === 'glow';
  const paint = lookPaint(o.look, o.baseHue, o.accentHue, o.saturation);
  const name = emotionName(o.emotion);
  const emotion = name
    ? buildEmotion(
        name,
        {
          ink: glow ? o.colors.eyeMid : ok(paint.ink),
          mouth: glow ? o.colors.eyeLine : ok(paint.mouth),
          s,
          face: { x: fx, y: fy },
          eyes: eyeBoxes,
          tilt: o.tilt,
        },
        o.seedKey,
        o.emotionVariant,
      )
    : null;
  if (emotion) eyes.forEach((e, i) => (e.mod = emotion.eyes[i]!));

  return {
    options: o,
    colors: o.colors,
    paint,
    tileRadius: TILES[o.tile as keyof typeof TILES] ?? o.tile,
    hasBackground: o.tile !== 'none',
    body: { ...box, shape: B.shape },
    core: { x: ccx - coreW / 2, y: ccy - coreH / 2, w: coreW, h: coreH, shape: B.core.shape ?? B.shape },
    shade: { x: fx - shadeW / 2, y: fy - shadeH / 2, w: shadeW, h: shadeH },
    face: { x: fx, y: fy },
    eyes,
    accessories: placeAccessories(o.accessories, { s, tilt: o.tilt, face: { x: fx, y: fy }, crown: { x: crx, y: cry }, eyes: eyeBoxes }),
    blur: { core: 6.5 * s, shade: 5 * s, glow: 0.7 },
    scale: s,
    emotion,
  };
}
