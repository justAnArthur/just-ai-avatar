import { type AvatarOptions, resolve, rngFromSeed } from './options.ts';
import { BODIES, type BodyDef, EYES, type EyeDef, type Shape, TILES, shapeStyle } from './shapes.ts';

type CSS = Record<string, string | number | undefined>;

export type AvatarProps = AvatarOptions & {
  class?: string;
  style?: CSS;
};

const f = (n: number) => +n.toFixed(3);
const pct = (n: number) => `${f(n)}%`;
/** 1cqw = 1% of the tile width, so every length scales with the avatar. */
const cq = (n: number) => `${f(n)}cqw`;

export const KEYFRAMES =
  '@keyframes aiav-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}' +
  '@keyframes aiav-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5%)}}' +
  '@keyframes aiav-look{0%,35%,100%{transform:translate(0,0)}45%,60%{transform:translate(3.5%,-1%)}70%,85%{transform:translate(-3%,.5%)}}' +
  '@media (prefers-reduced-motion:reduce){[data-aiav-anim]{animation:none!important}}';

/** Glowing AI avatar. Every part is a div with inline styles; no stylesheet needed. */
export function Avatar({ class: className, style: extraStyle, ...options }: AvatarProps) {
  const o = resolve(options);
  const c = o.colors;
  const B: BodyDef = BODIES[o.body];
  const { box } = B;
  const s = B.scale;
  const moving = (m: string) => o.animate.includes(m as never);
  const delay = `${f(rngFromSeed(JSON.stringify(options))() * 4)}s`;

  // face point in tile %
  const fx = box.x + (B.face.x * box.w) / 100;
  const fy = box.y + (B.face.y * box.h) / 100;

  // core box in body %, sized in tile units for shape rounding
  const core = B.core;
  const coreShape: Shape = core.shape ?? B.shape;

  // shade behind the eyes: tile units mapped into the body box
  const shadeW = ((39.8 * s) / box.w) * 100;
  const shadeH = ((30.9 * s) / box.h) * 100;

  const tile: CSS = {
    position: 'relative',
    display: 'block',
    overflow: 'hidden',
    isolation: 'isolate',
    width: typeof o.size === 'number' ? `${o.size}px` : o.size,
    aspectRatio: '1',
    containerType: 'inline-size',
    borderRadius: TILES[o.tile as keyof typeof TILES] ?? o.tile,
    background: o.tile === 'none' ? 'transparent' : `linear-gradient(180deg,${c.bgTop} 0%,${c.bgBottom} 45%)`,
    ...extraStyle,
  };

  const half = 13 * o.spacing * s;
  const t = (o.tilt * Math.PI) / 180;

  const eyes = ([-1, 1] as const).map((side, i) => {
    const type: EyeDef = EYES[o.eyes[i]!];
    const w = type.w * s * o.eyeScale;
    const h = type.h * s * o.eyeScale;
    const cx = fx + side * half * Math.cos(t) + o.gazeX * 4 * s;
    const cy = fy - side * half * Math.sin(t) + o.gazeY * 3 * s;
    const blink = moving('blink') && !type.arc;

    const inner: CSS = type.arc
      ? {
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: `${cq(w * 0.22)} solid ${c.eyeMid}`,
          clipPath: 'inset(0 0 52% 0)',
        }
      : {
          width: '100%',
          height: '100%',
          borderRadius: type.radius ?? '50%',
          background: `linear-gradient(180deg,${c.eyeTop} 0%,${c.eyeMid} 30%,${c.eyeLow} 58%,${c.eyeBottom} 100%)`,
          boxShadow: `0 0 0 ${cq(0.3 * s)} ${c.eyeLine},0 0 ${cq(2.5 * s)} ${cq(0.5 * s)} ${c.eyeGlow}`,
          animation: blink ? `aiav-blink 4.5s ease-in-out ${delay} infinite` : undefined,
        };

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: pct(cx - w / 2),
          top: pct(cy - h * (type.arc ? 0.3 : 0.5)),
          width: pct(w),
          height: pct(h),
          transform: `rotate(${f(-o.tilt)}deg)`,
        }}
      >
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
          <div style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 ${cq(1.4)} rgb(255 255 255 / .75))` }}>
            <div
              style={{
                position: 'absolute',
                overflow: 'hidden',
                left: pct(box.x),
                top: pct(box.y),
                width: pct(box.w),
                height: pct(box.h),
                background: c.rim,
                ...shapeStyle(B.shape, box.w, box.h),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: pct(core.cx - core.w / 2),
                  top: pct(core.cy - core.h / 2),
                  width: pct(core.w),
                  height: pct(core.h),
                  filter: `blur(${cq(6.5 * s)})`,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `radial-gradient(circle,${c.core} 0%,${c.core} 60%,${c.coreEdge} 100%)`,
                    ...shapeStyle(coreShape, (core.w * box.w) / 100, (core.h * box.h) / 100),
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  borderRadius: '50%',
                  left: pct(B.face.x - shadeW / 2),
                  top: pct(B.face.y - shadeH / 2),
                  width: pct(shadeW),
                  height: pct(shadeH),
                  background: c.shade,
                  filter: `blur(${cq(5 * s)})`,
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
