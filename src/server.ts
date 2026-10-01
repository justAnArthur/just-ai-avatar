import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { Avatar } from './Avatar.tsx';
import type { AvatarOptions } from './options.ts';

/** Static, self-contained HTML for an avatar (SSR, emails, static sites). */
export function renderAvatarHTML(options: AvatarOptions = {}): string {
  return renderToString(h(Avatar, options));
}
