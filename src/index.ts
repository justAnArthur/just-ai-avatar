export { Avatar, KEYFRAMES, type AvatarProps } from './Avatar.tsx';
export { PALETTES, colorsFromHue, paletteColors, type Colors, type PaletteName } from './colors.ts';
export { DEFAULTS, optionsFromSeed, resolve, type AvatarOptions, type Motion } from './options.ts';
export { BODIES, EYES, EYE_PAIRS, TILES, roundedPolygon, type BodyName, type EyeName, type TileName } from './shapes.ts';
export { renderAvatarSVG, radiusPath, type SvgOptions } from './svg.ts';
export { layout, type Layout } from './layout.ts';
export {
  EMOTIONS, EMOTION_ALIASES, EMOTION_DURATION, buildEmotion, emotionName, variantCount,
  type EmotionName, type EmotionInput, type EmotionFrame,
} from './emotions.ts';
export { useEmotion, type EmotionHandle } from './use-emotion.ts';
