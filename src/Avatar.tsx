import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { EMOTION_KEYFRAMES, type Part, cutPolygon, partTransform } from './emotions.ts';
import { layout } from './layout.ts';
import { ok } from './looks.ts';
import { type AvatarOptions, rngFromSeed } from './options.ts';
import { accessoryNodes, sceneLayers } from './scene.ts';
import { type Box, shapeStyle } from './shapes.ts';
import { type Node, toVNode } from './tree.ts';

type CSS = Record<string, string | number | undefined>;

export type AvatarProps = AvatarOptions & {
  class?: string;
  style?: CSS;
  /** Change it to replay the same emotion; `useEmotion()` does this for you. */
  emotionKey?: string | number;
};

const f = (n: number) => +n.toFixed(3);
const pct = (n: number) => `${f(n)}%`;
const cq = (n: number) => `${f(n)}cqw`;
const place = (b: Box): CSS => ({ position: 'absolute', left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) });
const cover: CSS = { position: 'absolute', inset: 0 };

export const KEYFRAMES =
  '@keyframes aiav-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}' +
  '@keyframes aiav-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5%)}}' +
  '@keyframes aiav-look{0%,35%,100%{transform:translate(0,0)}45%,60%{transform:translate(3.5%,-1%)}70%,85%{transform:translate(-3%,.5%)}}' +
  '@media (prefers-reduced-motion:reduce){[data-aiav-anim]{animation:none!important}}' +
  EMOTION_KEYFRAMES;

/** AI avatar: the glow look is divs with inline styles, the other looks inline SVG. */
export const Avatar = ({ class: className, style, emotionKey, ...options }: AvatarProps) => {
  const L = layout(options);
  // useId restarts with every render-to-string call, so static avatars on one page also need the options hash
  const id = `aiav${Math.floor(rngFromSeed(JSON.stringify(L.options))() * 1e8).toString(36)}${useId().replace(/\W/g, '')}`;
  const { colors: c, body, scale: s, options: o } = L;
  const em = L.emotion;
  const emKey = em ? `${em.name}-${em.variant}-${emotionKey ?? ''}` : 'calm';

  const frame = (background: string): CSS => ({
    position: 'relative',
    display: 'block',
    overflow: 'hidden',
    isolation: 'isolate',
    width: typeof o.size === 'number' ? `${o.size}px` : o.size,
    aspectRatio: '1',
    containerType: 'inline-size',
    borderRadius: L.tileRadius,
    background,
    ...style,
  });
  const keyframes = o.animate && <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
  const classes = className ? `ai-avatar ${className}` : 'ai-avatar';

  const delay = `${f(rngFromSeed(o.seedKey)() * 4)}s`;
  const anim = (value: string | undefined) => (o.animate ? value : undefined);
  const idle = (value: string) => anim(em ? undefined : value);

  // float and emotion motion stay on HTML layers, so filtered SVG (fur, clay) isn't re-rendered every frame
  const moving = (children: ComponentChildren) => (
    <div data-aiav-anim style={{ ...cover, animation: anim(`aiav-float 5s ease-in-out ${delay} infinite`) }}>
      <div data-aiav-anim style={{ ...cover, transformOrigin: '50% 75%', animation: anim(em?.motion) }}>{children}</div>
    </div>
  );

  if (o.look !== 'glow') {
    const [top, bottom] = L.paint.bg;
    const [back, face, front] = sceneLayers(L, { id, animate: o.animate, emKey });
    // the still layers get their own compositing layer, so blinking doesn't re-run their filters
    const svg = (nodes: Node[], still: boolean) => (
      <svg viewBox="0 0 100 100" aria-hidden="true" style={{ ...cover, width: '100%', height: '100%', overflow: 'visible', willChange: still && o.animate ? 'transform' : undefined }}>
        {nodes.map(toVNode)}
      </svg>
    );
    return (
      <>
        {keyframes}
        <div class={classes} role="img" aria-label={o.label} style={frame(L.hasBackground ? `linear-gradient(180deg,${ok(top)},${ok(bottom)})` : 'transparent')}>
          {moving(<>{svg(back, true)}{svg(face, false)}{svg(front, true)}</>)}
        </div>
      </>
    );
  }

  const inBody = (b: Box): Box => ({
    x: ((b.x - body.x) / body.w) * 100,
    y: ((b.y - body.y) / body.h) * 100,
    w: (b.w / body.w) * 100,
    h: (b.h / body.h) * 100,
  });

  const eyes = L.eyes.map(({ def, box, rotate, mod }, i) => {
    const hide = mod.hide ? 0.4 : 1;
    const inner: CSS = def.arc
      ? {
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: `${cq(box.w * 0.22)} solid ${c.eyeMid}`,
          clipPath: 'inset(0 0 52% 0)',
        }
      : {
          width: '100%',
          height: '100%',
          borderRadius: def.radius ?? '50%',
          background: `linear-gradient(180deg,${c.eyeTop} 0%,${c.eyeMid} 30%,${c.eyeLow} 58%,${c.eyeBottom} 100%)`,
          boxShadow: `0 0 0 ${cq(0.3 * s)} ${c.eyeLine},0 0 ${cq(2.5 * s)} ${cq(0.5 * s)} ${c.eyeGlow}`,
          animation: idle(`aiav-blink 4.5s ease-in-out ${delay} infinite`),
        };

    return (
      <div key={i} style={{ ...place(box), transform: `rotate(${f(rotate)}deg)` }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${cq(mod.offset?.[0] ?? 0)},${cq(mod.offset?.[1] ?? 0)}) scale(${(mod.scale?.[0] ?? 1) * hide},${(mod.scale?.[1] ?? 1) * hide})`,
            clipPath: `polygon(${cutPolygon(mod.cut, i === 0).map(([x, y]) => `${f(x * 100)}% ${f(y * 100)}%`).join(',')})`,
            opacity: mod.hide ? 0 : 1,
            transition: o.animate ? 'transform .35s cubic-bezier(.3,1.4,.5,1),clip-path .35s ease,opacity .2s ease' : undefined,
          }}
        >
          <div data-aiav-anim style={inner} />
        </div>
      </div>
    );
  });

  return (
    <>
      {keyframes}
      <div class={classes} role="img" aria-label={o.label} style={frame(L.hasBackground ? `linear-gradient(180deg,${c.bgTop} 0%,${c.bgBottom} 45%)` : 'transparent')}>
        {moving(
          <>
            <div style={{ ...cover, filter: `drop-shadow(0 0 ${cq(L.blur.glow * 2)} rgb(255 255 255 / .75))` }}>
              <div style={{ ...place(body), overflow: 'hidden', background: c.rim, ...shapeStyle(body.shape, body.w, body.h) }}>
                <div style={{ ...place(inBody(L.core)), filter: `blur(${cq(L.blur.core)})` }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `radial-gradient(circle,${c.core} 0%,${c.core} 60%,${c.coreEdge} 100%)`,
                      ...shapeStyle(L.core.shape, L.core.w, L.core.h),
                    }}
                  />
                </div>
                <div style={{ ...place(inBody(L.shade)), borderRadius: '50%', background: c.shade, filter: `blur(${cq(L.blur.shade)})` }} />
                {em?.blobs.map((b, i) => (
                  <div
                    key={`${emKey}-${i}`}
                    data-aiav-anim
                    style={{
                      ...place(inBody({ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h })),
                      borderRadius: '50%',
                      background: b.color,
                      filter: `blur(${cq(b.blur)})`,
                      animation: anim('aiav-fade .4s ease-out both'),
                    }}
                  />
                ))}
              </div>
            </div>

            <div data-aiav-anim style={{ ...cover, animation: idle(`aiav-look 7s ease-in-out ${delay} infinite`) }}>
              {eyes}
              {em && <Overlay key={`${emKey}-face`} parts={em.parts.filter((p) => p.layer === 'face')} glow={c.eyeGlow} animate={o.animate} />}
              <Layer nodes={accessoryNodes(L, 'face', { id: `${id}-f` })} glow={c.eyeGlow} />
            </div>
            <Layer nodes={accessoryNodes(L, 'head', { id: `${id}-h` })} glow={c.eyeGlow} />
            {em && <Overlay key={`${emKey}-fx`} parts={em.parts.filter((p) => p.layer === 'fx')} glow={c.eyeGlow} animate={o.animate} />}
          </>,
        )}
      </div>
    </>
  );
};

const Layer = ({ nodes, glow }: { nodes: Node[]; glow: string }) =>
  nodes.length ? (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ ...cover, width: '100%', height: '100%', overflow: 'visible', filter: `drop-shadow(0 0 ${cq(0.8)} ${glow})` }}>
      {nodes.map(toVNode)}
    </svg>
  ) : null;

const Overlay = ({ parts, glow, animate }: { parts: Part[]; glow: string; animate: boolean }) =>
  parts.length ? (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ ...cover, width: '100%', height: '100%', overflow: 'visible', filter: `drop-shadow(0 0 ${cq(0.8)} ${glow})` }}>
      {parts.map((p, i) => (
        <g
          key={i}
          data-aiav-anim
          style={{
            animation: animate ? p.anim : undefined,
            transformBox: p.origin ? 'view-box' : 'fill-box',
            transformOrigin: p.origin ? `${f(p.origin[0])}px ${f(p.origin[1])}px` : 'center',
          }}
        >
          <path
            d={p.d}
            transform={partTransform(p.at)}
            fill={p.fill ?? 'none'}
            stroke={p.stroke}
            stroke-width={p.width}
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray={p.dash?.join(' ')}
            opacity={p.opacity}
          />
        </g>
      ))}
    </svg>
  ) : null;
