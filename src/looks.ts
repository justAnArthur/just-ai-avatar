import { yellowLift } from './colors.ts';

/** How the avatar is rendered; accessories and emotions follow it. */
export const LOOKS = ['glow', 'flat', 'plush', 'clay'] as const;

export type LookName = (typeof LOOKS)[number];

/** OKLCH lightness, chroma, hue. */
export type Tone = [l: number, c: number, h: number];

/** What an accessory piece is made of; each look turns it into its own material. */
export type Role = 'fill' | 'trim' | 'gold' | 'leaf' | 'lens' | 'glass' | 'frame' | 'shine';

export type Paint = {
  bg: [Tone, Tone];
  body: Tone;
  eye: Tone;
  /** Emotion strokes: closed eyes, mouths, Zzz. */
  ink: Tone;
  /** Inside of an open mouth. */
  mouth: Tone;
  roles: Record<Role, Tone>;
};

export function ok([l, c, h]: Tone, alpha?: number): string {
  return `oklch(${+l.toFixed(3)} ${+c.toFixed(3)} ${+h.toFixed(1)}${alpha == null ? '' : ` / ${alpha}`})`;
}

export function shade([l, c, h]: Tone, dl: number, dc = 0): Tone {
  return [Math.min(1, Math.max(0, l + dl)), Math.max(0, c + dc), h];
}

export function lookPaint(look: LookName, hue: number, accentHue: number, saturation = 100): Paint {
  const k = saturation / 100;
  const t = (l: number, c: number, h = hue): Tone => {
    const H = ((h % 360) + 360) % 360;
    return [l < 0.9 ? Math.min(0.92, l + yellowLift(H, k)) : l, c * k, H];
  };

  const body = { glow: t(0.98, 0.01), flat: t(0.7, 0.18), plush: t(0.66, 0.2), clay: t(0.72, 0.15) }[look];
  const lightBody = body[0] > 0.8;
  const eye = look === 'flat' ? (lightBody ? t(0.26, 0.05) : t(0.99, 0.005)) : t(0.17, 0.015);
  const ink = look === 'flat' ? eye : t(0.2, 0.03);

  if (look === 'glow') {
    return {
      bg: [t(0.749, 0.155), t(0.643, 0.196, hue + 19.5)],
      body, eye: t(0.95, 0.03), ink: t(0.95, 0.03), mouth: t(0.6, 0.13),
      roles: {
        fill: t(0.97, 0.04, accentHue), trim: t(0.995, 0.008), gold: [0.95, 0.08, 90], leaf: [0.95, 0.07, 145],
        lens: t(0.88, 0.06), glass: [1, 0, 0], frame: t(0.995, 0.01), shine: [1, 0, 0],
      },
    };
  }

  return {
    bg: {
      flat: [t(0.97, 0.025), t(0.93, 0.045)] as [Tone, Tone],
      plush: [t(0.21, 0.035), t(0.13, 0.025)] as [Tone, Tone],
      clay: [t(0.9, 0.05), t(0.8, 0.08)] as [Tone, Tone],
    }[look],
    body, eye, ink,
    mouth: look === 'flat' ? shade(body, -0.28) : t(0.36, 0.13, 20),
    roles: {
      fill: t(0.62, 0.18, accentHue),
      trim: t(0.95, 0.03, accentHue),
      gold: t(0.84, 0.16, 85),
      leaf: t(0.72, 0.19, 145),
      lens: t(0.22, 0.03, accentHue),
      glass: [1, 0, 0],
      frame: t(0.22, 0.02),
      shine: [1, 0, 0],
    },
  };
}
