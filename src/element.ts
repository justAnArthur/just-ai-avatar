import { h, render } from 'preact';
import { Avatar } from './Avatar.tsx';
import { type EmotionInput, playTime } from './emotions.ts';
import type { AvatarOptions } from './options.ts';

const ATTRS = {
  seed: 'seed', look: 'look', accessories: 'accessories', 'accent-hue': 'accentHue',
  size: 'size', palette: 'palette', hue: 'hue', saturation: 'saturation',
  tile: 'tile', body: 'body', eyes: 'eyes', tilt: 'tilt', spacing: 'spacing',
  'eye-scale': 'eyeScale', 'gaze-x': 'gazeX', 'gaze-y': 'gazeY', animate: 'animate', label: 'label',
  emotion: 'emotion', 'emotion-variant': 'emotionVariant',
} as const;

const NUMERIC = new Set(['accentHue', 'hue', 'saturation', 'tilt', 'spacing', 'eyeScale', 'gazeX', 'gazeY', 'emotionVariant']);

function parse(key: string, value: string) {
  if (NUMERIC.has(key)) return Number(value);
  if (key === 'size') return /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  if (key === 'eyes' && value.includes(' ')) return value.split(/\s+/);
  if (key === 'accessories') return value.split(/\s+/).filter(Boolean);
  if (key === 'animate') return value !== 'false';
  return value;
}

/**
 * Registers `<ai-avatar seed="agent-42" look="plush" accessories="beret glasses" emotion="sleepy">`.
 * `el.emote('error')` plays an emotion for a moment, `el.calm()` ends it.
 */
export function defineAvatarElement(tag = 'ai-avatar') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;

  customElements.define(
    tag,
    class extends HTMLElement {
      static observedAttributes = Object.keys(ATTRS);
      #root = this.attachShadow({ mode: 'open' });
      #options: AvatarOptions = {};
      #emotion: EmotionInput | null = null;
      #emotionKey = 0;
      #timer?: ReturnType<typeof setTimeout>;

      get options() { return this.#options; }
      set options(value: AvatarOptions) { this.#options = value; this.#render(); }

      connectedCallback() { this.#render(); }
      disconnectedCallback() { clearTimeout(this.#timer); }
      attributeChangedCallback() { if (this.isConnected) this.#render(); }

      /** Plays for `duration` ms, the emotion's own length by default; `Infinity` holds it. */
      emote(emotion: EmotionInput, { duration }: { duration?: number } = {}) {
        clearTimeout(this.#timer);
        this.#emotion = emotion;
        this.#emotionKey++;
        this.#render();
        const ms = playTime(emotion, duration);
        if (Number.isFinite(ms)) this.#timer = setTimeout(() => this.calm(), ms);
      }

      calm() {
        clearTimeout(this.#timer);
        this.#emotion = null;
        this.#render();
      }

      #render() {
        const props: Record<string, unknown> = {};
        for (const [attr, key] of Object.entries(ATTRS)) {
          const value = this.getAttribute(attr);
          if (value != null) props[key] = parse(key, value);
        }

        render(
          h('div', { style: { display: 'contents' } },
            h('style', null, ':host{display:inline-block;line-height:0;vertical-align:middle}'),
            h(Avatar, { ...props, ...this.#options, ...(this.#emotion && { emotion: this.#emotion }), emotionKey: this.#emotionKey })),
          this.#root,
        );
      }
    },
  );
}
