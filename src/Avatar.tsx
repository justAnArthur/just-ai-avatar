import { layout } from './layout.ts';
import type { AvatarOptions } from './options.ts';
import { rngFromSeed } from './options.ts';
import { type Box, shapeStyle } from './shapes.ts';

type CSS = Record<string, string | number | undefined>;

export type AvatarProps = AvatarOptions & {
  class?: string;
  style?: CSS;
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
export function Avatar({ class: className, style: extraStyle, ...options }: AvatarProps) {
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

  const eyes = L.eyes.map(({ def, box, rotate }, i) => {
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
        <div data-aiav-anim={blink ? '' : undefined} style={inner} />
      </div>
    );
  });

  return (
    <>
      {o.animate.length > 0 && <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />}
      <div class={className ? `ai-avatar ${className}` : 'ai-avatar'} role="img" aria-label={o.label} style={tile}>
        <div
          data-aiav-anim={moving('float') ? '' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            animation: moving('float') ? `aiav-float 5s ease-in-out ${delay} infinite` : undefined,
          }}
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
          </div>
        </div>
      </div>
    </>
  );
}
