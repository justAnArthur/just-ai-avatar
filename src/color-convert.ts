/**
 * Converts the CSS colors this library produces (oklch(), rgb(), #hex) into a hex color
 * plus opacity. SVG editors (Figma, Illustrator, Inkscape) don't read oklch(), so
 * exported SVGs only contain hex colors.
 */
export function toHex(css: string): { hex: string; alpha: number } {
  const s = css.trim().toLowerCase();

  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length <= 4) h = [...h].map((ch) => ch + ch).join('');
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { hex: `#${h.slice(0, 6)}`, alpha };
  }

  const fn = /^(oklch|rgba?)\((.*)\)$/.exec(s);
  if (!fn) return { hex: s, alpha: 1 };

  const [body, alphaPart] = fn[2]!.split('/') as [string, string | undefined];
  const parts = body.split(/[\s,]+/).filter(Boolean);
  let alpha = alphaPart != null ? parseAlpha(alphaPart) : 1;

  let rgb: [number, number, number];
  if (fn[1] === 'oklch') {
    rgb = oklchToSrgb(parseFloat(parts[0]!) * (parts[0]!.endsWith('%') ? 0.01 : 1), parseFloat(parts[1]!), parseFloat(parts[2]!));
  } else {
    rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p)) / 255) as [number, number, number];
    if (parts[3] != null) alpha = parseAlpha(parts[3]);
  }
  return { hex: `#${rgb.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('')}`, alpha };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const parseAlpha = (a: string) => (a.trim().endsWith('%') ? parseFloat(a) / 100 : parseFloat(a));

/** OKLCH → gamma-encoded sRGB (0–1), with chroma reduced until the color fits the sRGB gamut. */
function oklchToSrgb(L: number, C: number, H: number): [number, number, number] {
  const convert = (c: number) => {
    const h = (H * Math.PI) / 180;
    const a = c * Math.cos(h);
    const b = c * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) as [number, number, number];
  };
  const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.001 && v <= 1.001);

  let rgb = convert(C);
  if (inGamut(rgb)) return rgb;
  // binary search for the largest chroma that fits, like browsers' gamut mapping
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(convert(mid))) lo = mid;
    else hi = mid;
  }
  rgb = convert(lo);
  return rgb;
}
