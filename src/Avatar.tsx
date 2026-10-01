import { EMOTION_KEYFRAMES, type Part, cutPolygon, partTransform } from './emotions.ts';
import { layout } from './layout.ts';
import type { AvatarOptions } from './options.ts';
import { rngFromSeed } from './options.ts';
import { type Box, shapeStyle } from './shapes.ts';

type CSS = Record<string, string | number | undefined>;

export type AvatarProps = AvatarOptions & {
  class?: string;
  style?: CSS;
  /** Change it to replay the same emotion (`useEmotion()` does this for you). */
  emotionKey?: string | number;
};

const f = (n: number) => +n.toFixed(3);
const pct = (n: number) => `${f(n)}%`;
/** 1cqw = 1% of the tile width = 1 tile unit, so every length scales with the avatar. */
const cq = (n: number) => `${f(n)}cqw`;

export const KEYFRAMES =
  '@keyframes aiav-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}' +
  '@keyframes aiav-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5%)}}' +
  '@keyframes aiav-look{0%,35%,100%{transform:translate(0,0)}45%,60%{transform:translate(3.5%,-1%)}70%,85%{transform:translate(-3%,.5%)}}' +
  '@media (prefers-reduced-motion:reduce){[data-aiav-anim]{animation:none!important}}';

const place = (b: Box): CSS => ({ position: 'absolute', left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) });

/** Glowing AI avatar. Every part is a div with inline styles; no stylesheet needed. */
export function Avatar({ class: className, style: extraStyle, emotionKey, ...options }: AvatarProps) {
  const L = layout(options);
  const { colors: c, body, scale: s } = L;
  const o = L.options;
  const moving = (m: string) => o.animate.includes(m as never);
  const delay = `${f(rngFromSeed(JSON.stringify(options))() * 4)}s`;

  // core and shade live inside the clipped body, so position them in body %
  const inBody = (b: Box): Box => ({
    x: ((b.x - body.x) / body.w) * 100,
    y: ((b.y - body.y) / body.h) * 100,
    w: (b.w / body.w) * 100,
    h: (b.h / body.h) * 100,
  });

  const tile: CSS = {
    position: 'relative',
    display: 'block',
    overflow: 'hidden',
    isolation: 'isolate',
    width: typeof o.size === 'number' ? `${o.size}px` : o.size,
    aspectRatio: '1',
    containerType: 'inline-size',
    borderRadius: L.tileRadius,
    background: L.hasBackground ? `linear-gradient(180deg,${c.bgTop} 0%,${c.bgBottom} 45%)` : 'transparent',
    ...extraStyle,
  };

  const em = L.emotion;
  const emKey = em ? `${em.name}-${em.variant}-${emotionKey ?? ''}` : 'calm';

  const eyes = L.eyes.map(({ def, box, rotate, mod }, i) => {
    const blink = moving('blink') && !def.arc;
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
          animation: blink ? `aiav-blink 4.5s ease-in-out ${delay} infinite` : undefined,
        };
    return (
      <div key={i} style={{ ...place(box), transform: `rotate(${f(rotate)}deg)` }}>
        {/* the emotion reshapes the eye here; transitions make it morph back and forth */}
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${cq(mod.offset?.[0] ?? 0)},${cq(mod.offset?.[1] ?? 0)}) scale(${(mod.scale?.[0] ?? 1) * (mod.hide ? 0.4 : 1)},${(mod.scale?.[1] ?? 1) * (mod.hide ? 0.4 : 1)})`,
            clipPath: `polygon(${cutPolygon(mod.cut, i === 0).map(([x, y]) => `${f(x * 100)}% ${f(y * 100)}%`).join(',')})`,
            opacity: mod.hide ? 0 : 1,
            transition: 'transform .35s cubic-bezier(.3,1.4,.5,1),clip-path .35s ease,opacity .2s ease',
          }}
        >
          <div data-aiav-anim={blink ? '' : undefined} style={inner} />
        </div>
      </div>
    );
  });

  return (
    <>
      {(o.animate.length > 0 || em) && <style dangerouslySetInnerHTML={{ __html: em ? KEYFRAMES + EMOTION_KEYFRAMES : KEYFRAMES }} />}
      <div class={className ? `ai-avatar ${className}` : 'ai-avatar'} role="img" aria-label={o.label} style={tile}>
        <div
          data-aiav-anim={moving('float') ? '' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            animation: moving('float') ? `aiav-float 5s ease-in-out ${delay} infinite` : undefined,
          }}
        >
          <div
            data-aiav-anim={em?.motion ? '' : undefined}
            style={{ position: 'absolute', inset: 0, transformOrigin: '50% 75%', animation: em?.motion }}
          >
          {/* glow follows whatever shape the body is clipped to */}
          <div style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 ${cq(L.blur.glow * 2)} rgb(255 255 255 / .75))` }}>
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
              <div
                style={{
                  ...place(inBody(L.shade)),
                  borderRadius: '50%',
                  background: c.shade,
                  filter: `blur(${cq(L.blur.shade)})`,
                }}
              />
              {em?.blobs.map((b, i) => (
                <div
                  key={`${emKey}-blob${i}`}
                  style={{
                    ...place(inBody({ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h })),
                    borderRadius: '50%',
                    background: b.color,
                    filter: `blur(${cq(b.blur)})`,
                    animation: 'aiav-fade .4s ease-out both',
                  }}
                />
              ))}
            </div>
          </div>
          <div
            data-aiav-anim={moving('look') ? '' : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              animation: moving('look') ? `aiav-look 7s ease-in-out ${delay} infinite` : undefined,
            }}
          >
            {eyes}
            {em && <Overlay parts={em.parts.filter((p) => p.layer === 'face')} glow={c.eyeGlow} id={`${emKey}-face`} />}
          </div>
          {em && <Overlay parts={em.parts.filter((p) => p.layer === 'fx')} glow={c.eyeGlow} id={`${emKey}-fx`} />}
          </div>
        </div>
      </div>
    </>
  );
}

/** Emotion parts in tile units, drawn in an SVG layer that covers the tile. */
function Overlay({ parts, glow, id }: { parts: Part[]; glow: string; id: string }) {
  if (!parts.length) return null;
  return (
    <svg
      key={id}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', filter: `drop-shadow(0 0 ${cq(0.8)} ${glow})` }}
    >
      {parts.map((p, i) => (
        <g
          key={i}
          data-aiav-anim={p.anim ? '' : undefined}
          style={{
            animation: p.anim,
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
  );
}
