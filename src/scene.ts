import type { Piece } from './accessories.ts';
import { type EyeMod, cutPolygon, partTransform } from './emotions.ts';
import type { Layout } from './layout.ts';
import { type LookName, type Role, type Tone, ok, shade } from './looks.ts';
import { blurFilter, castFilter, clayFilter, feltFilter, reliefStops } from './materials.ts';
import { rngFromSeed } from './options.ts';
import { radiusPath, shapePath } from './shapes.ts';
import { type Node, el } from './tree.ts';

export type SceneOptions = {
  /** Unique per avatar on the page: gradients and filters are referenced by id. */
  id: string;
  animate?: boolean;
  /** Changes when an emotion replays, so its pop-in animations restart. */
  emKey?: string;
};

type Ctx = Required<SceneOptions> & { L: Layout; look: LookName; delay: string; detail: number; defs: Node[]; seen: Set<string> };

const f = (n: number) => +n.toFixed(3);
const EASE_BACK = 'cubic-bezier(.3,1.4,.5,1)';

function def(c: Ctx, key: string, make: (id: string) => Node): string {
  const id = `${c.id}-${key}`;
  if (!c.seen.has(id)) {
    c.seen.add(id);
    c.defs.push(make(id));
  }
  return `url(#${id})`;
}

function context(L: Layout, o: SceneOptions): Ctx {
  return {
    animate: false, emKey: 'calm', ...o,
    L, look: L.options.look, delay: `${f(rngFromSeed(L.options.seedKey)() * 4)}s`, defs: [], seen: new Set(),
    // a CSS-length size gives no pixels to go by; 160px is the default size
    detail: Math.min(1, Math.max(0.3, (typeof L.options.size === 'number' ? L.options.size : 160) / 360)),
  };
}

function anim(c: Ctx, animation: string | undefined, style: Record<string, string> = {}) {
  return c.animate && animation ? { 'data-aiav-anim': '', style: { animation, transformBox: 'view-box', ...style } } : {};
}

const stops = (list: [number, Tone][]) => list.map(([offset, tone]) => el('stop', { offset, 'stop-color': ok(tone) }));

const blur = (c: Ctx, sd: number) => def(c, `blur${f(sd)}`.replace('.', '_'), (id) => blurFilter(id, sd));

// felt for soft pieces; metal, lenses and frames in plush are glossy like clay
const SOFT: Role[] = ['fill', 'trim', 'leaf'];

function material(c: Ctx, role: Role): Record<string, string | number | undefined> {
  const tone = c.L.paint.roles[role];
  const hue = c.L.options.baseHue;
  if (role === 'shine') return { fill: ok(tone), opacity: 0.85 };
  if (role === 'glass') return { fill: ok(tone), opacity: 0.16 };
  if (role === 'lens' && c.look === 'glow') return { fill: ok(tone), opacity: 0.55 };
  if (c.look === 'glow' || c.look === 'flat' || role === 'frame') return { fill: ok(tone) };

  const felt = c.look === 'plush' && SOFT.includes(role);
  return {
    fill: def(c, `m-${role}`, (id) => el('radialGradient', { id, cx: 0.36, cy: 0.28, r: 0.85 }, reliefStops(tone, felt ? 0.7 : 1.3))),
    filter: felt
      ? def(c, 'felt-s', (id) => feltFilter(id, 0.45, hue, c.detail))
      : def(c, 'clay-s', (id) => clayFilter(id, 0.35, hue)),
  };
}

function pieceNode(c: Ctx, p: Piece): Node {
  const m = material(c, p.role);
  const attrs = p.width
    ? { fill: 'none', stroke: ok(c.L.paint.roles[p.role]), 'stroke-width': p.width, 'stroke-linecap': 'round', opacity: m.opacity, filter: m.filter }
    : { ...m, 'fill-rule': p.evenodd ? 'evenodd' : undefined };
  return el('path', { d: p.d, transform: partTransform(p.at), ...attrs });
}

function pieceNodes(c: Ctx, slot: 'head' | 'face'): Node | null {
  const pieces = c.L.accessories[slot];
  if (!pieces.length) return null;
  const solid = c.look === 'plush' || c.look === 'clay';
  const cast = solid ? def(c, `cast-${slot}`, (id) => castFilter(id, (slot === 'head' ? 1 : 0.6) * c.L.scale, c.L.options.baseHue)) : undefined;
  return el('g', { filter: cast }, pieces.map((p) => pieceNode(c, p)));
}

function bodyClip(c: Ctx): string {
  return def(c, 'body-clip', (id) => el('clipPath', { id }, el('path', { d: shapePath(c.L.body.shape, c.L.body) })));
}

function bodyNodes(c: Ctx): Node[] {
  const { body, paint, face, scale: s, options } = c.L;
  const d = shapePath(body.shape, body);
  const hue = options.baseHue;

  // flat shading: one crisp darker crescent on the far side
  if (c.look === 'flat') {
    return [
      el('path', { d, fill: ok(shade(paint.body, -0.07)) }),
      el('g', { 'clip-path': bodyClip(c) }, el('path', { d, transform: `translate(${f(-2.4 * s)} ${f(-3 * s)})`, fill: ok(paint.body) })),
    ];
  }

  const fill = def(c, 'body', (id) =>
    el('radialGradient', { id, gradientUnits: 'userSpaceOnUse', cx: face.x - 12 * s, cy: face.y - 20 * s, r: 64 * s },
      reliefStops(paint.body, c.look === 'clay' ? 1.8 : 2.1)));
  if (c.look === 'plush') return [el('path', { d, fill, filter: def(c, 'felt', (id) => feltFilter(id, s, hue, c.detail)) })];

  const hx = face.x - 21 * s;
  const hy = face.y - 17 * s;
  return [
    el('path', { d, fill, filter: def(c, 'clay', (id) => clayFilter(id, s, hue)) }),
    el('g', { 'clip-path': bodyClip(c) },
      el('ellipse', { cx: hx, cy: hy, rx: 10 * s, ry: 5.5 * s, transform: `rotate(-32 ${f(hx)} ${f(hy)})`, fill: '#ffffff', opacity: 0.38, filter: blur(c, 2.6 * s) }),
      el('ellipse', { cx: hx - 1.5 * s, cy: hy - 0.5 * s, rx: 3.6 * s, ry: 1.7 * s, transform: `rotate(-32 ${f(hx)} ${f(hy)})`, fill: '#ffffff', opacity: 0.75, filter: blur(c, 0.5 * s) })),
  ];
}

function modTransform(mod: EyeMod, cx: number, cy: number) {
  const k = mod.hide ? 0.4 : 1;
  const [sx, sy] = (mod.scale ?? [1, 1]).map((v) => f(v * k));
  const [dx, dy] = (mod.offset ?? [0, 0]).map(f);
  return {
    svg: `translate(${dx} ${dy}) translate(${f(cx)} ${f(cy)}) scale(${sx} ${sy}) translate(${f(-cx)} ${f(-cy)})`,
    css: `translate(${dx}px,${dy}px) translate(${f(cx)}px,${f(cy)}px) scale(${sx},${sy}) translate(${f(-cx)}px,${f(-cy)}px)`,
  };
}

function eyeNodes(c: Ctx): Node[] {
  const { paint } = c.L;
  const color = ok(paint.eye);
  const blink = c.animate && !c.L.emotion
    ? { 'data-aiav-anim': '', style: { animation: `aiav-blink 4.5s ease-in-out ${c.delay} infinite`, transformBox: 'fill-box', transformOrigin: 'center' } }
    : {};

  return c.L.eyes.map(({ def: shape, box: b, rotate, mod }, i) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const m = modTransform(mod, cx, cy);
    const cut = mod.cut
      ? def(c, `cut${i}`, (id) =>
          el('clipPath', { id }, el('polygon', { points: cutPolygon(mod.cut, i === 0).map(([px, py]) => `${f(b.x + px * b.w)},${f(b.y + py * b.h)}`).join(' ') })))
      : undefined;

    const t = b.w * 0.22;
    const drawn = shape.arc
      ? el('ellipse', {
          cx, cy, rx: b.w / 2 - t / 2, ry: b.h / 2 - t / 2, fill: 'none', stroke: color, 'stroke-width': t, 'stroke-linecap': 'round',
          'clip-path': def(c, `arc${i}`, (id) => el('clipPath', { id }, el('rect', { x: b.x - 1, y: b.y - 1, width: b.w + 2, height: b.h * 0.48 + 1 }))),
        })
      : el('g', blink, c.look === 'flat' ? el('path', { d: radiusPath(shape.radius ?? '50%', b), fill: color }) : bead(c, shape.radius ?? '50%', b));

    return el('g', { transform: `rotate(${f(rotate)} ${f(cx)} ${f(cy)})` },
      el('g', {
        transform: m.svg,
        opacity: mod.hide ? 0 : undefined,
        style: c.animate ? { transform: m.css, opacity: mod.hide ? 0 : 1, transition: `transform .35s ${EASE_BACK},opacity .2s ease` } : undefined,
      }, el('g', { 'clip-path': cut }, drawn)));
  });
}

// a glossy bead set into the body: its socket shadow, a lit underside, a window highlight and a small bounce glint
function bead(c: Ctx, radius: string, b: { x: number; y: number; w: number; h: number }): Node[] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = c.L.scale;
  const eye = c.L.paint.eye;
  const socket = c.look === 'plush'
    ? el('ellipse', { cx, cy: cy + b.h * 0.06, rx: b.w * 0.62, ry: b.h * 0.6, fill: ok([0.1, 0.03, c.L.options.baseHue], 0.5), filter: blur(c, 0.9 * s) })
    : el('ellipse', { cx: cx + b.w * 0.05, cy: cy + b.h * 0.14, rx: b.w * 0.5, ry: b.h * 0.5, fill: ok([0.1, 0.03, c.L.options.baseHue], 0.32), filter: blur(c, 0.8 * s) });
  const glossy = def(c, 'bead', (id) =>
    el('radialGradient', { id, cx: 0.5, cy: 0.78, r: 0.8, fx: 0.5, fy: 0.9 }, stops([[0, shade(eye, 0.2, 0.02)], [0.5, eye], [1, shade(eye, -0.05)]])));
  return [
    socket,
    el('path', { d: radiusPath(radius, b), fill: glossy }),
    el('ellipse', { cx: cx + b.w * 0.17, cy: cy - b.h * 0.21, rx: b.w * 0.18, ry: b.h * 0.12, transform: `rotate(-24 ${f(cx + b.w * 0.17)} ${f(cy - b.h * 0.21)})`, fill: '#ffffff', opacity: 0.95 }),
    el('circle', { cx: cx - b.w * 0.17, cy: cy + b.h * 0.24, r: b.w * 0.07, fill: '#ffffff', opacity: 0.4 }),
  ];
}

function partNodes(c: Ctx, layer: 'face' | 'fx'): Node | null {
  const parts = c.L.emotion?.parts.filter((p) => p.layer === layer);
  if (!parts?.length) return null;
  return el('g', { key: `${c.emKey}-${layer}` },
    parts.map((p) =>
      el('g', c.animate && p.anim
        ? { 'data-aiav-anim': '', style: { animation: p.anim, transformBox: p.origin ? 'view-box' : 'fill-box', transformOrigin: p.origin ? `${f(p.origin[0])}px ${f(p.origin[1])}px` : 'center' } }
        : {},
        el('path', {
          d: p.d, transform: partTransform(p.at), fill: p.fill ?? 'none', stroke: p.stroke, 'stroke-width': p.width,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': p.dash?.join(' '), opacity: p.opacity,
        }))));
}

function blobNodes(c: Ctx): Node | null {
  const blobs = c.L.emotion?.blobs;
  if (!blobs?.length) return null;
  return el('g', { key: `${c.emKey}-blobs`, 'clip-path': bodyClip(c) },
    blobs.map((b, i) =>
      el('ellipse', {
        cx: b.x, cy: b.y, rx: b.w / 2, ry: b.h / 2, fill: b.color,
        filter: blur(c, b.blur),
        ...anim(c, 'aiav-fade .4s ease-out both'),
      })));
}

function tileClip(c: Ctx): string {
  return def(c, 'tile', (id) => el('clipPath', { id }, el('path', { d: radiusPath(c.L.tileRadius, { x: 0, y: 0, w: 100, h: 100 }) })));
}

function backdrop(c: Ctx): Node | false {
  const [top, bottom] = c.L.paint.bg;
  return c.L.hasBackground && el('rect', {
    width: 100, height: 100,
    fill: def(c, 'bg', (id) => el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, stops([[0, top], [1, bottom]]))),
  });
}

function withDefs(c: Ctx, nodes: (Node | Node[] | null | false)[]): Node[] {
  const list = nodes.flat().filter((n): n is Node => !!n);
  return c.defs.length ? [el('defs', {}, c.defs), ...list] : list;
}

/** Accessories for one slot, in the avatar's look; the glow renderer lays them over its divs. */
export function accessoryNodes(L: Layout, slot: 'head' | 'face', o: SceneOptions): Node[] {
  const c = context(L, o);
  return withDefs(c, L.accessories[slot].map((p) => pieceNode(c, p)));
}

function layers(c: Ctx) {
  const em = c.L.emotion;
  return {
    back: [bodyNodes(c), blobNodes(c)],
    face: [el('g', anim(c, em ? undefined : `aiav-look 7s ease-in-out ${c.delay} infinite`), eyeNodes(c), partNodes(c, 'face'), pieceNodes(c, 'face'))],
    front: [pieceNodes(c, 'head'), partNodes(c, 'fx')],
  };
}

/**
 * The live avatar in three SVG layers: the filtered body and hats stay still while the face animates,
 * so fur and clay are rendered once. Gradients and filters live in the first layer.
 */
export function sceneLayers(L: Layout, o: SceneOptions): [Node[], Node[], Node[]] {
  const c = context(L, o);
  const { back, face, front } = layers(c);
  const flat = (list: (Node | Node[] | null | false)[]) => list.flat().filter((n): n is Node => !!n);
  return [withDefs(c, back), flat(face), flat(front)];
}

/** The whole avatar as one still SVG in a 100×100 view box, for every look but glow. */
export function sceneNodes(L: Layout, o: SceneOptions): Node[] {
  const c = context(L, o);
  const { back, face, front } = layers(c);
  return withDefs(c, [el('g', { 'clip-path': tileClip(c) }, backdrop(c), back, face, front)]);
}
