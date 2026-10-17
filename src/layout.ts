import { type Anchors, type Piece, type Slot, accessoryDrop, accessoryRise, placeAccessories, rotate } from './accessories.ts';
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
  accessories: Record<Slot, Piece[]>;
  /** Standard deviations. */
  blur: { core: number; shade: number; glow: number };
  scale: number;
  emotion: EmotionFrame | null;
};

export function layout(input: AvatarOptions = {}): Layout {
  const o = resolve(input);
  const B: BodyDef = BODIES[o.body];
  const crown = B.crown ?? { x: 50, y: 0 };
  const rise = accessoryRise(o.accessories) * B.scale;
  const { box, s } = B.whole ? fitWhole(B, crown, rise, accessoryDrop(o.accessories) * B.scale) : dropForHat(B, crown, rise);
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

  // a tie hangs from the bottom of a whole body; a cropped one wears it low, at the tile edge, so it never reads as a mouth
  const [ox, oy] = B.whole ? [box.x + box.w / 2, box.y + box.h / 2] : [fx, fy];
  const [dx, dy] = rotate(0, B.whole ? box.h / 2 - s : 30 * s, -o.tilt * 0.4);

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
    accessories: placeAccessories(o.accessories, { s, tilt: o.tilt, face: { x: fx, y: fy }, crown: { x: crx, y: cry }, neck: { x: ox + dx, y: oy + dy }, whole: !!B.whole, eyes: eyeBoxes }),
    blur: { core: 6.5 * s, shade: 5 * s, glow: 0.7 },
    scale: s,
    emotion,
  };
}

type Crown = { x: number; y: number };

const PAD = 4;

// a hat needs room above the head; cropped bodies overflow the bottom, so moving them down keeps the crop
function dropForHat(B: BodyDef, crown: Crown, rise: number) {
  const crownY = B.box.y + (crown.y * B.box.h) / 100;
  return { box: { ...B.box, y: B.box.y + (rise ? Math.max(0, rise + 2 - crownY) : 0) }, s: B.scale };
}

// a whole body and what it wears shrink together until they fit the tile, centered
function fitWhole(B: BodyDef, crown: Crown, rise: number, drop: number) {
  const above = Math.max(0, rise - (crown.y * B.box.h) / 100);
  const height = B.box.h + above + drop;
  const k = Math.min(1, (100 - 2 * PAD) / height);
  const w = B.box.w * k;
  const h = B.box.h * k;
  const cx = B.box.x + B.box.w / 2;
  const cy = B.box.y + B.box.h / 2;
  return { box: { x: cx - w / 2, y: cy - (height * k) / 2 + above * k, w, h }, s: B.scale * k };
}
