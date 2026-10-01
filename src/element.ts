import { h, render } from 'preact';
import { Avatar } from './Avatar.tsx';
import { EMOTION_DURATION, type EmotionInput, emotionName } from './emotions.ts';
import type { AvatarOptions } from './options.ts';

const ATTRS = {
  seed: 'seed', size: 'size', palette: 'palette', hue: 'hue', saturation: 'saturation',
  tile: 'tile', body: 'body', eyes: 'eyes', tilt: 'tilt', spacing: 'spacing',
  'eye-scale': 'eyeScale', 'gaze-x': 'gazeX', 'gaze-y': 'gazeY', animate: 'animate', label: 'label',
  emotion: 'emotion', 'emotion-variant': 'emotionVariant',
} as const;
const NUMERIC = new Set(['hue', 'saturation', 'tilt', 'spacing', 'eyeScale', 'gazeX', 'gazeY', 'emotionVariant']);

/**
 * Registers `<ai-avatar>` for use without Preact/JSX:
 *   <ai-avatar seed="agent-42" body="hexagon" eyes="oval happy" animate="blink"></ai-avatar>
 *
 * Emotions: set the `emotion` attribute to hold one, or play one for a moment:
 *   document.querySelector('ai-avatar').emote('error');
 */
export function defineAvatarElement(tag = 'ai-avatar') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;

  customElements.define(
    tag,
    class extends HTMLElement {
      static observedAttributes = Object.keys(ATTRS);
      #options: AvatarOptions = {};
      #root = this.attachShadow({ mode: 'open' });
      #emotion: EmotionInput | null = null;
      #emotionKey = 0;
      #timer?: ReturnType<typeof setTimeout>;

      /** Play an emotion for `duration` ms (default: the emotion's own length; `Infinity` holds it). */
      emote(emotion: EmotionInput, { duration }: { duration?: number } = {}) {
        clearTimeout(this.#timer);
        this.#emotion = emotion;
        this.#emotionKey++;
        this.#render();
        const name = emotionName(emotion);
        const ms = duration ?? (name ? EMOTION_DURATION[name] : 2500);
        if (Number.isFinite(ms)) this.#timer = setTimeout(() => this.calm(), ms);
      }

      /** Return to the calm face (or to the `emotion` attribute, if set). */
      calm() {
        clearTimeout(this.#timer);
        this.#emotion = null;
        this.#render();
      }

      get options() { return this.#options; }
      set options(value: AvatarOptions) { this.#options = value ?? {}; this.#render(); }
      connectedCallback() { this.#render(); }
      disconnectedCallback() { clearTimeout(this.#timer); }
      attributeChangedCallback() { if (this.isConnected) this.#render(); }

      #render() {
        const props: Record<string, unknown> = {};
        for (const [attr, key] of Object.entries(ATTRS)) {
          const v = this.getAttribute(attr);
          if (v == null) continue;
          if (NUMERIC.has(key)) props[key] = Number(v);
          else if (key === 'size') props[key] = /^\d+(\.\d+)?$/.test(v) ? Number(v) : v;
          else if (key === 'eyes' && v.includes(' ')) props[key] = v.split(/\s+/);
          else if (key === 'animate') props[key] = v === 'true' || v.split(/[\s,]+/).filter(Boolean);
          else props[key] = v;
        }
        render(
          h('div', { style: { display: 'contents' } },
            h('style', null, ':host{display:inline-block;line-height:0;vertical-align:middle}'),
            h(Avatar, {
              ...props,
              ...this.#options,
              ...(this.#emotion ? { emotion: this.#emotion } : {}),
              emotionKey: this.#emotionKey,
            })),
          this.#root,
        );
      }
    },
  );
}
