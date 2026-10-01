import { h, render } from 'preact';
import { Avatar } from './Avatar.tsx';
import type { AvatarOptions } from './options.ts';

const ATTRS = {
  seed: 'seed', size: 'size', palette: 'palette', hue: 'hue', saturation: 'saturation',
  tile: 'tile', body: 'body', eyes: 'eyes', tilt: 'tilt', spacing: 'spacing',
  'eye-scale': 'eyeScale', 'gaze-x': 'gazeX', 'gaze-y': 'gazeY', animate: 'animate', label: 'label',
} as const;
const NUMERIC = new Set(['hue', 'saturation', 'tilt', 'spacing', 'eyeScale', 'gazeX', 'gazeY']);

/**
 * Registers `<ai-avatar>` for use without Preact/JSX:
 *   <ai-avatar seed="agent-42" body="hexagon" eyes="oval happy" animate="blink"></ai-avatar>
 */
export function defineAvatarElement(tag = 'ai-avatar') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;

  customElements.define(
    tag,
    class extends HTMLElement {
      static observedAttributes = Object.keys(ATTRS);
      #options: AvatarOptions = {};
      #root = this.attachShadow({ mode: 'open' });

      get options() { return this.#options; }
      set options(value: AvatarOptions) { this.#options = value ?? {}; this.#render(); }
      connectedCallback() { this.#render(); }
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
            h(Avatar, { ...props, ...this.#options })),
          this.#root,
        );
      }
    },
  );
}
