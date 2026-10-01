import { h, type VNode } from 'preact';
import { toHex } from './color-convert.ts';

type Value = string | number | undefined;
type Attrs = Record<string, Value | Record<string, Value>> & { style?: Record<string, Value> };
type Child = Node | string | false | null | undefined | Child[];

/** SVG element tree that both renderers share: Preact for the live avatar, markup for the still SVG. */
export type Node = { tag: string; attrs: Attrs; children: (Node | string)[] };

const round = (v: Value) => (typeof v === 'number' ? +v.toFixed(3) : v);

export function el(tag: string, attrs: Attrs = {}, ...children: Child[]): Node {
  const flat = (children as unknown[]).flat(Infinity).filter((c): c is Node | string => !!c);
  const rounded = Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, typeof v === 'object' ? v : round(v)]));
  return { tag, attrs: rounded, children: flat };
}

const OPACITY = { fill: 'fill-opacity', stroke: 'stroke-opacity', 'stop-color': 'stop-opacity', 'flood-color': 'flood-opacity' } as const;
const escape = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

// design tools don't read oklch(), so markup gets hex + opacity; `style` only carries animation and is dropped
function attr(key: string, value: string | number): string {
  if (!(key in OPACITY) || typeof value === 'number' || value === 'none' || value.startsWith('url(')) return `${key}="${escape(String(value))}"`;
  const { hex, alpha } = toHex(value);
  return `${key}="${hex}"${alpha < 1 ? ` ${OPACITY[key as keyof typeof OPACITY]}="${round(alpha)}"` : ''}`;
}

export function toMarkup(node: Node | string): string {
  if (typeof node === 'string') return escape(node);
  const attrs = Object.entries(node.attrs)
    .filter((e): e is [string, string | number] => e[1] != null && typeof e[1] !== 'object' && e[0] !== 'key')
    .map(([k, v]) => ` ${attr(k, v)}`)
    .join('');
  return node.children.length ? `<${node.tag}${attrs}>${node.children.map(toMarkup).join('')}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

export function toVNode(node: Node | string): VNode | string {
  if (typeof node === 'string') return node;
  return h(node.tag, node.attrs as Record<string, unknown>, ...node.children.map(toVNode));
}
