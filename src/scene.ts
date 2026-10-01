import type { Piece } from './accessories.ts';
import { type EyeMod, cutPolygon, partTransform } from './emotions.ts';
import type { Layout } from './layout.ts';
import { type LookName, type Role, type Tone, ok, shade } from './looks.ts';
import { rngFromSeed } from './options.ts';
import { radiusPath, shapePath } from './shapes.ts';
import { type Node, el } from './tree.ts';

export type SceneOptions = {
  /** Unique per avatar on the page: gradients and filters are referenced by id. */
  id: string;
  animate?: boolean;
  /** Changes when an emotion replays, so its pop-in animations restart. */
  emKey?: string;
  /** Tile background and crop; the live avatar leaves them, and the float, to its HTML frame. */
  backdrop?: boolean;
};

type Ctx = Required<SceneOptions> & { L: Layout; look: LookName; delay: string; defs: Node[]; seen: Set<string> };

const f = (n: number) => +n.toFixed(3);
const FELT: Role[] = ['fill', 'trim', 'leaf'];
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
    animate: false, emKey: 'calm', backdrop: true, ...o,
    L, look: L.options.look, delay: `${f(rngFromSeed(L.options.seedKey)() * 4)}s`, defs: [], seen: new Set(),
  };
}

function anim(c: Ctx, animation: string | undefined, style: Record<string, string> = {}) {
  return c.animate && animation ? { 'data-aiav-anim': '', style: { animation, transformBox: 'view-box', ...style } } : {};
}

const stops = (list: [number, Tone][]) => list.map(([offset, tone]) => el('stop', { offset, 'stop-color': ok(tone) }));

const region = { filterUnits: 'userSpaceOnUse', x: -30, y: -30, width: 160, height: 160 };

const blurFilter = (id: string, sd: number) => el('filter', { id, ...region }, el('feGaussianBlur', { stdDeviation: sd }));

// felt: wobbly edge from displacement noise, then dark specks for the pile
const furFilter = (id: string, scale: number) =>
  el('filter', { id, ...region },
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: 3, result: 'n' }),
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 2.6, seed: 8, result: 'g' }),
    el('feColorMatrix', { in: 'g', type: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.4 0.82', result: 'specks' }),
    el('feComposite', { in: 'specks', in2: 'd', operator: 'in', result: 'grain' }),
    el('feMerge', {}, el('feMergeNode', { in: 'd' }), el('feMergeNode', { in: 'grain' })));

// clay: soft dark rim bottom-right, light rim top-left, both inside the shape
const clayFilter = (id: string, sd: number, d: number, hue: number) =>
  el('filter', { id, ...region },
    el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: sd, result: 'b' }),
    el('feOffset', { in: 'b', dx: -d * 0.7, dy: -d, result: 'up' }),
    el('feComposite', { in: 'SourceAlpha', in2: 'up', operator: 'out', result: 'low' }),
    el('feFlood', { 'flood-color': ok([0.25, 0.06, hue], 0.45) }),
    el('feComposite', { in2: 'low', operator: 'in', result: 'shadow' }),
    el('feOffset', { in: 'b', dx: d * 0.7, dy: d, result: 'down' }),
    el('feComposite', { in: 'SourceAlpha', in2: 'down', operator: 'out', result: 'high' }),
    el('feFlood', { 'flood-color': ok([1, 0, 0], 0.35) }),
    el('feComposite', { in2: 'high', operator: 'in', result: 'light' }),
    el('feMerge', {}, el('feMergeNode', { in: 'SourceGraphic' }), el('feMergeNode', { in: 'shadow' }), el('feMergeNode', { in: 'light' })));

const relief = (look: LookName, tone: Tone): [number, Tone][] =>
  look === 'clay'
    ? [[0, shade(tone, 0.1, -0.02)], [0.45, tone], [1, shade(tone, -0.24)]]
    : [[0, shade(tone, 0.07)], [0.55, tone], [1, shade(tone, -0.14)]];

function material(c: Ctx, role: Role): Record<string, string | number | undefined> {
  const tone = c.L.paint.roles[role];
  if (role === 'shine') return { fill: ok(tone), opacity: 0.85 };
  if (role === 'glass') return { fill: ok(tone), opacity: 0.16 };
  if (role === 'lens' && c.look === 'glow') return { fill: ok(tone), opacity: 0.55 };
  if (c.look === 'glow' || c.look === 'flat' || role === 'frame') return { fill: ok(tone) };

  const fill = def(c, `m-${role}`, (id) => el('radialGradient', { id, cx: 0.38, cy: 0.3, r: 0.8 }, stops(relief(c.look, tone))));
  if (c.look === 'clay') return { fill, filter: def(c, 'clay-s', (id) => clayFilter(id, 0.9, 1.4, c.L.options.baseHue)) };
  return { fill, filter: FELT.includes(role) ? def(c, 'fur-s', (id) => furFilter(id, 1.4)) : undefined };
}

function pieceNode(c: Ctx, p: Piece): Node {
  const m = material(c, p.role);
  const attrs = p.width
    ? { fill: 'none', stroke: ok(c.L.paint.roles[p.role]), 'stroke-width': p.width, 'stroke-linecap': 'round', opacity: m.opacity }
    : { ...m, 'fill-rule': p.evenodd ? 'evenodd' : undefined };
  return el('path', { d: p.d, transform: partTransform(p.at), ...attrs });
}

function bodyClip(c: Ctx): string {
  return def(c, 'body-clip', (id) => el('clipPath', { id }, el('path', { d: shapePath(c.L.body.shape, c.L.body) })));
}

function bodyNodes(c: Ctx): Node[] {
  const { body, paint, face, scale: s } = c.L;
  const d = shapePath(body.shape, body);
  if (c.look === 'flat') return [el('path', { d, fill: ok(paint.body) })];

  const fill = def(c, 'body', (id) =>
    el('radialGradient', { id, gradientUnits: 'userSpaceOnUse', cx: face.x - 8 * s, cy: face.y - 14 * s, r: 62 * s }, stops(relief(c.look, paint.body))));
  if (c.look === 'plush') return [el('path', { d, fill, filter: def(c, 'fur', (id) => furFilter(id, 3.2)) })];

  const hx = face.x - 22 * s;
  const hy = face.y - 18 * s;
  return [
    el('path', { d, fill, filter: def(c, 'clay', (id) => clayFilter(id, 2.2, 3, c.L.options.baseHue)) }),
    el('g', { 'clip-path': bodyClip(c) },
      el('ellipse', {
        cx: hx, cy: hy, rx: 9 * s, ry: 4.5 * s, transform: `rotate(-30 ${f(hx)} ${f(hy)})`,
        fill: '#ffffff', opacity: 0.6, filter: def(c, 'spec', (id) => blurFilter(id, 1.8 * s)),
      })),
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
      : el('g', blink,
          el('path', { d: radiusPath(shape.radius ?? '50%', b), fill: color }),
          c.look !== 'flat' && el('ellipse', { cx: cx + b.w * 0.18, cy: cy - b.h * 0.2, rx: b.w * 0.17, ry: b.h * 0.12, fill: '#ffffff', opacity: 0.9 }));

    return el('g', { transform: `rotate(${f(rotate)} ${f(cx)} ${f(cy)})` },
      el('g', {
        transform: m.svg,
        opacity: mod.hide ? 0 : undefined,
        style: c.animate ? { transform: m.css, opacity: mod.hide ? 0 : 1, transition: `transform .35s ${EASE_BACK},opacity .2s ease` } : undefined,
      }, el('g', { 'clip-path': cut }, drawn)));
  });
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
        filter: def(c, `blob${i}`, (id) => blurFilter(id, b.blur)),
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

/** The whole avatar as SVG nodes in a 100×100 view box, for every look but glow. */
export function sceneNodes(L: Layout, o: SceneOptions): Node[] {
  const c = context(L, o);
  const em = L.emotion;

  const avatar = [
    bodyNodes(c),
    blobNodes(c),
    el('g', anim(c, em ? undefined : `aiav-look 7s ease-in-out ${c.delay} infinite`),
      eyeNodes(c),
      partNodes(c, 'face'),
      L.accessories.face.map((p) => pieceNode(c, p))),
    L.accessories.head.map((p) => pieceNode(c, p)),
    partNodes(c, 'fx'),
  ];
  if (!c.backdrop) return withDefs(c, avatar.flat());

  return withDefs(c, [el('g', { 'clip-path': tileClip(c) }, backdrop(c), avatar)]);
}
