import { toHex } from './color-convert.ts';
import { cutPolygon, partTransform } from './emotions.ts';
import { layout } from './layout.ts';
import { type AvatarOptions, rngFromSeed } from './options.ts';
import { type Box, polygonCorners, type Shape } from './shapes.ts';

export type SvgOptions = {
  /** Set it when inlining several SVGs into one page. */
  idPrefix?: string;
};

const n = (v: number) => +v.toFixed(3);

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
  const arc = (rx: number, ry: number, ex: number, ey: number) => (rx && ry ? `A${n(rx)} ${n(ry)} 0 0 1 ${n(ex)} ${n(ey)}` : `L${n(ex)} ${n(ey)}`);
  return [
    `M${n(x + tlh)} ${n(y)}`,
    `H${n(x + w - trh)}`,
    arc(trh, trv, x + w, y + trv),
    `V${n(y + h - brv)}`,
    arc(brh, brv, x + w - brh, y + h),
    `H${n(x + blh)}`,
    arc(blh, blv, x, y + h - blv),
    `V${n(y + tlv)}`,
    arc(tlh, tlv, x + tlh, y),
    'Z',
  ].join('');
}

function shapePath(shape: Shape, b: Box): string {
  if ('radius' in shape) return radiusPath(shape.radius, b);
  const at = ([px, py]: readonly [number, number]) => `${n(b.x + px)} ${n(b.y + py)}`;
  return `${polygonCorners(shape.points, b.w, b.h, shape.round)
    .map(({ s, p, e }, i) => `${i ? 'L' : 'M'}${at(s)}Q${at(p)} ${at(e)}`)
    .join('')}Z`;
}

function paint(attr: 'fill' | 'stroke' | 'stop-color' | 'flood-color', css: string): string {
  const { hex, alpha } = toHex(css);
  const opacityAttr = attr === 'stop-color' ? 'stop-opacity' : attr === 'flood-color' ? 'flood-opacity' : `${attr}-opacity`;
  return `${attr}="${hex}"${alpha < 1 ? ` ${opacityAttr}="${n(alpha)}"` : ''}`;
}

const stops = (list: [number, string][]) => list.map(([o, c]) => `<stop offset="${o}" ${paint('stop-color', c)}/>`).join('');

const blurFilter = (id: string, sd: number) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200"><feGaussianBlur stdDeviation="${n(sd)}"/></filter>`;

/** Still SVG with hex colors only, so design tools open it; also the source for PNG/JPEG export. */
export function renderAvatarSVG(options: AvatarOptions = {}, svgOptions: SvgOptions = {}): string {
  const L = layout(options);
  const c = L.colors;
  const s = L.scale;
  const size = typeof L.options.size === 'number' ? L.options.size : 160;
  const id = svgOptions.idPrefix ?? `aiav${Math.floor(rngFromSeed(JSON.stringify(options))() * 1e8).toString(36)}`;

  const tilePath = radiusPath(L.tileRadius, { x: 0, y: 0, w: 100, h: 100 });
  const bodyPath = shapePath(L.body.shape, L.body);
  const corePath = shapePath(L.core.shape, L.core);
  const coreCx = L.core.x + L.core.w / 2;
  const coreCy = L.core.y + L.core.h / 2;
  const coreR = Math.hypot(L.core.w / 2, L.core.h / 2); // css `circle` reaches the farthest corner

  const defs = [
    `<clipPath id="${id}-tile"><path d="${tilePath}"/></clipPath>`,
    `<clipPath id="${id}-body"><path d="${bodyPath}"/></clipPath>`,
    `<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1">${stops([[0, c.bgTop], [0.45, c.bgBottom]])}</linearGradient>`,
    `<radialGradient id="${id}-core" gradientUnits="userSpaceOnUse" cx="${n(coreCx)}" cy="${n(coreCy)}" r="${n(coreR)}">${stops([[0, c.core], [0.6, c.core], [1, c.coreEdge]])}</radialGradient>`,
    `<linearGradient id="${id}-eye" x1="0" y1="0" x2="0" y2="1">${stops([[0, c.eyeTop], [0.3, c.eyeMid], [0.58, c.eyeLow], [1, c.eyeBottom]])}</linearGradient>`,
    blurFilter(`${id}-core-blur`, L.blur.core),
    blurFilter(`${id}-shade-blur`, L.blur.shade),
    blurFilter(`${id}-eye-glow`, 1.25 * s),
    `<filter id="${id}-glow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${n(L.blur.glow)}" result="b"/>` +
      `<feFlood flood-color="#ffffff" flood-opacity="0.75"/><feComposite in2="b" operator="in" result="g"/>` +
      `<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  ];

  const eyes = L.eyes.map(({ def, box: b, rotate, mod }, i) => {
    if (mod.hide) return '';
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const [sx, sy] = mod.scale ?? [1, 1];
    const [dx, dy] = mod.offset ?? [0, 0];
    const transform =
      `rotate(${n(rotate)} ${n(cx)} ${n(cy)})` +
      (dx || dy ? ` translate(${n(dx)} ${n(dy)})` : '') +
      (sx !== 1 || sy !== 1 ? ` translate(${n(cx)} ${n(cy)}) scale(${n(sx)} ${n(sy)}) translate(${n(-cx)} ${n(-cy)})` : '');
    let clip = '';
    if (mod.cut) {
      const pts = cutPolygon(mod.cut, i === 0).map(([px, py]) => `${n(b.x + px * b.w)},${n(b.y + py * b.h)}`).join(' ');
      defs.push(`<clipPath id="${id}-cut${i}"><polygon points="${pts}"/></clipPath>`);
      clip = ` clip-path="url(#${id}-cut${i})"`;
    }
    if (def.arc) {
      const t = b.w * 0.22;
      defs.push(`<clipPath id="${id}-arc${i}"><rect x="${n(b.x - 1)}" y="${n(b.y - 1)}" width="${n(b.w + 2)}" height="${n(b.h * 0.48 + 1)}"/></clipPath>`);
      return (
        `<g transform="${transform}"><g${clip}><ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(b.w / 2 - t / 2)}" ry="${n(b.h / 2 - t / 2)}" ` +
        `fill="none" ${paint('stroke', c.eyeMid)} stroke-width="${n(t)}" clip-path="url(#${id}-arc${i})"/></g></g>`
      );
    }
    const d = radiusPath(def.radius ?? '50%', b);
    return (
      `<g transform="${transform}"><g${clip}>` +
      `<path d="${d}" ${paint('fill', c.eyeGlow)} ${paint('stroke', c.eyeGlow)} stroke-width="${n(1 * s)}" filter="url(#${id}-eye-glow)"/>` +
      `<path d="${d}" fill="none" ${paint('stroke', c.eyeLine)} stroke-width="${n(0.6 * s)}"/>` +
      `<path d="${d}" fill="url(#${id}-eye)"/>` +
      `</g></g>`
    );
  });

  const em = L.emotion;
  const blobs = (em?.blobs ?? []).map((bl, i) => {
    defs.push(blurFilter(`${id}-blob${i}`, bl.blur));
    return `<ellipse cx="${n(bl.x)}" cy="${n(bl.y)}" rx="${n(bl.w / 2)}" ry="${n(bl.h / 2)}" ${paint('fill', bl.color)} filter="url(#${id}-blob${i})"/>`;
  });
  let overlay = '';
  if (em?.parts.length) {
    const { hex, alpha } = toHex(c.eyeGlow);
    defs.push(
      `<filter id="${id}-fx-glow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">` +
        `<feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="b"/><feFlood flood-color="${hex}" flood-opacity="${n(alpha)}"/>` +
        `<feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    );
    const parts = em.parts.map((p) => {
      const t = partTransform(p.at);
      return (
        `<path d="${p.d}"${t ? ` transform="${t}"` : ''} ${p.fill ? paint('fill', p.fill) : 'fill="none"'}` +
        (p.stroke ? ` ${paint('stroke', p.stroke)} stroke-width="${n(p.width ?? 1)}" stroke-linecap="round" stroke-linejoin="round"` : '') +
        (p.dash ? ` stroke-dasharray="${p.dash.join(' ')}"` : '') +
        (p.opacity != null ? ` opacity="${n(p.opacity)}"` : '') +
        '/>'
      );
    });
    overlay = `<g filter="url(#${id}-fx-glow)">${parts.join('')}</g>`;
  }

  const sh = L.shade;
  const label = L.options.label.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${label}">` +
    `<defs>${defs.join('')}</defs>` +
    `<g clip-path="url(#${id}-tile)">` +
    (L.hasBackground ? `<rect width="100" height="100" fill="url(#${id}-bg)"/>` : '') +
    `<g filter="url(#${id}-glow)"><g clip-path="url(#${id}-body)">` +
    `<path d="${bodyPath}" ${paint('fill', c.rim)}/>` +
    `<path d="${corePath}" fill="url(#${id}-core)" filter="url(#${id}-core-blur)"/>` +
    `<ellipse cx="${n(sh.x + sh.w / 2)}" cy="${n(sh.y + sh.h / 2)}" rx="${n(sh.w / 2)}" ry="${n(sh.h / 2)}" ${paint('fill', c.shade)} filter="url(#${id}-shade-blur)"/>` +
    blobs.join('') +
    `</g></g>` +
    eyes.join('') +
    overlay +
    `</g></svg>`
  );
}
