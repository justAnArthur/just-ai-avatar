export interface Colors {
  bgTop: string;
  bgBottom: string;
  core: string;
  coreEdge: string;
  rim: string;
  shade: string;
  eyeTop: string;
  eyeMid: string;
  eyeLow: string;
  eyeBottom: string;
  eyeLine: string;
  eyeGlow: string;
}

export type Palette = { hue: number; saturation?: number } | { colors: Colors };

export const PALETTES = {
  sky: { hue: 233 },
  mint: { hue: 175 },
  lime: { hue: 135 },
  sun: { hue: 80 },
  peach: { hue: 55 },
  coral: { hue: 25 },
  rose: { hue: 355 },
  grape: { hue: 305 },
  indigo: { hue: 270 },
  slate: { hue: 250, saturation: 22 },
  night: {
    colors: {
      bgTop: '#2b2f63',
      bgBottom: '#121433',
      core: '#6d4dff',
      coreEdge: '#8466ff',
      rim: '#eeeaff',
      shade: 'rgb(40 10 160 / .4)',
      eyeTop: '#ffffff',
      eyeMid: '#f1edff',
      eyeLow: '#ddd4ff',
      eyeBottom: '#b9a8ff',
      eyeLine: 'rgb(60 30 190 / .5)',
      eyeGlow: 'rgb(80 50 230 / .35)',
    },
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/**
 * Full color set for a hue. OKLCH keeps perceived brightness equal across hues;
 * lightness/chroma/hue offsets are measured from the original sky avatar (hue 233).
 */
export function colorsFromHue(hue: number, saturation = 100): Colors {
  const k = saturation / 100;
  // yellows and limes only look clean when lighter, so lift them a little
  const d = Math.abs(((((hue - 105) % 360) + 540) % 360) - 180);
  const lift = d < 60 ? 0.11 * Math.cos((d / 60) * (Math.PI / 2)) * k : 0;

  const c = (l: number, ch: number, dh: number, a?: number) => {
    const L = l < 0.9 ? Math.min(0.9, l + lift) : l;
    const H = (((hue + dh) % 360) + 360) % 360;
    return `oklch(${+L.toFixed(3)} ${+(ch * k).toFixed(3)} ${+H.toFixed(1)}${a == null ? '' : ` / ${a}`})`;
  };

  return {
    bgTop: c(0.749, 0.155, 0),
    bgBottom: c(0.643, 0.196, 19.5),
    core: c(0.732, 0.154, 1),
    coreEdge: c(0.761, 0.15, -4),
    rim: c(0.981, 0.009, -1),
    shade: c(0.616, 0.15, 10, 0.35),
    eyeTop: c(0.982, 0.005, 40),
    eyeMid: c(0.949, 0.029, 0),
    eyeLow: c(0.918, 0.053, -8),
    eyeBottom: c(0.869, 0.081, -13),
    eyeLine: c(0.607, 0.134, 4, 0.45),
    eyeGlow: c(0.642, 0.147, 7, 0.35),
  };
}

export function paletteColors(name: PaletteName, saturation?: number): Colors {
  const p: Palette = PALETTES[name] ?? PALETTES.sky;
  return 'colors' in p ? p.colors : colorsFromHue(p.hue, saturation ?? p.saturation ?? 100);
}
