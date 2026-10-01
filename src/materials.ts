import { type Tone, ok, shade } from './looks.ts';
import { type Node, el } from './tree.ts';

// every length here is in tile units, so a look renders the same at 40px and at 1024px;
// SVG lighting filters would not: they measure slopes in device pixels

const region = { filterUnits: 'userSpaceOnUse', x: -30, y: -30, width: 160, height: 160, 'color-interpolation-filters': 'sRGB' };

const flood = (color: string, mask: string, result: string) => [
  el('feFlood', { 'flood-color': color }),
  el('feComposite', { in2: mask, operator: 'in', result }),
];

// alpha = gain·R + bias: turns noise into sparse specks of one color
const specks = (input: string, rgb: 0 | 1, gain: number, bias: number, result: string) =>
  el('feColorMatrix', { in: input, type: 'matrix', values: `0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 0 ${rgb} ${gain} 0 0 0 ${bias}`, result });

/**
 * Inner light and shade that give a flat silhouette volume: a soft core shadow low on the far side,
 * a rim of light on the near side and occlusion along the whole edge. `k` scales it to the shape size.
 */
function volume(shape: string, k: number, hue: number, { shadow = 0.5, rim = 0.45, edge = 0.25, rimBlur = 1.6 } = {}) {
  return [
    el('feGaussianBlur', { in: shape, stdDeviation: 6 * k, result: 'v-wide' }),
    el('feOffset', { in: 'v-wide', dx: -3 * k, dy: -4.5 * k, result: 'v-up' }),
    el('feComposite', { in: shape, in2: 'v-up', operator: 'out', result: 'v-low' }),
    ...flood(ok([0.18, 0.08, hue], shadow), 'v-low', 'shadow'),

    el('feGaussianBlur', { in: shape, stdDeviation: rimBlur * k, result: 'v-tight' }),
    el('feOffset', { in: 'v-tight', dx: 1.4 * k, dy: 2.2 * k, result: 'v-down' }),
    el('feComposite', { in: shape, in2: 'v-down', operator: 'out', result: 'v-high' }),
    ...flood(ok([1, 0, 0], rim), 'v-high', 'rim'),

    el('feGaussianBlur', { in: shape, stdDeviation: 2.5 * k, result: 'v-soft' }),
    el('feComposite', { in: shape, in2: 'v-soft', operator: 'arithmetic', k2: 1, k3: -1, result: 'v-band' }),
    ...flood(ok([0.15, 0.06, hue], edge), 'v-band', 'edge'),
  ];
}

const merge = (...inputs: string[]) => el('feMerge', {}, inputs.map((i) => el('feMergeNode', { in: i })));

/**
 * Plush felt: fuzzy silhouette with stray fibers, a pile of light and dark specks, soft clumps, volume.
 * `detail` (0–1) follows the rendered size: small avatars get a coarser, quieter pile instead of glitter.
 */
export function feltFilter(id: string, k: number, hue: number, detail: number): Node {
  const amp = 0.5 + detail / 2;
  return el('filter', { id, ...region },
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 2, seed: 2, result: 'warp' }),
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'warp', scale: 3.4 * k, xChannelSelector: 'R', yChannelSelector: 'G', result: 'fuzz' }),
    el('feGaussianBlur', { in: 'fuzz', stdDeviation: 0.22, result: 'shape' }),

    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 2.4 * detail, seed: 6, result: 'hair' }),
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'hair', scale: 5.5 * k, xChannelSelector: 'R', yChannelSelector: 'G', result: 'stray' }),
    el('feGaussianBlur', { in: 'stray', stdDeviation: 0.35, result: 'stray-soft' }),
    // fibers on the silhouette catch the light, like velvet
    el('feComponentTransfer', { in: 'stray-soft', result: 'halo' },
      ...(['R', 'G', 'B'] as const).map((ch) => el(`feFunc${ch}`, { type: 'linear', slope: 0.75, intercept: 0.22 })),
      el('feFuncA', { type: 'linear', slope: 0.6 })),

    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 2.2 * detail, numOctaves: 2, seed: 9, result: 'pile-raw' }),
    el('feGaussianBlur', { in: 'pile-raw', stdDeviation: 0.16 / detail, result: 'pile' }),
    specks('pile', 0, 0.9 * amp, -0.38 * amp, 'pile-dark'),
    specks('pile', 1, -0.9 * amp, 0.45 * amp, 'pile-light'),
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.3, numOctaves: 2, seed: 4, result: 'clumps' }),
    el('feGaussianBlur', { in: 'clumps', stdDeviation: 0.6, result: 'clumps-soft' }),
    specks('clumps-soft', 0, 0.45, -0.2, 'clump-dark'),
    specks('clumps-soft', 1, -0.45, 0.25, 'clump-light'),
    merge('clump-dark', 'clump-light', 'pile-dark', 'pile-light'),
    el('feComposite', { in2: 'shape', operator: 'in', result: 'texture' }),

    ...volume('shape', k, hue, { shadow: 0.55, rim: 0.32, edge: 0.3, rimBlur: 2.2 }),
    merge('halo', 'shape', 'texture', 'shadow', 'edge', 'rim'),
  );
}

/** Clay: smooth and glossy, a soft shadow on the far side and a crisp rim of light on the near one. */
export function clayFilter(id: string, k: number, hue: number): Node {
  return el('filter', { id, ...region },
    ...volume('SourceGraphic', k, hue, { shadow: 0.42, rim: 0.7, edge: 0.18, rimBlur: 1 }),
    merge('SourceGraphic', 'shadow', 'edge', 'rim'),
  );
}

export function blurFilter(id: string, sd: number): Node {
  return el('filter', { id, ...region }, el('feGaussianBlur', { stdDeviation: sd }));
}

/** What a hat or glasses cast onto the body. */
export function castFilter(id: string, k: number, hue: number): Node {
  return el('filter', { id, ...region },
    el('feDropShadow', { dx: 0.4 * k, dy: 1.6 * k, stdDeviation: 1.4 * k, 'flood-color': ok([0.15, 0.08, hue], 0.4) }));
}

/** Light top-left to dark bottom-right; `contrast` grows it. */
export function reliefStops(tone: Tone, contrast: number): Node[] {
  return ([[0, shade(tone, 0.08 * contrast, -0.02 * contrast)], [0.42, tone], [1, shade(tone, -0.14 * contrast, 0.01)]] as const)
    .map(([offset, t]) => el('stop', { offset, 'stop-color': ok(t) }));
}
