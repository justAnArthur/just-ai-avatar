import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { Avatar } from './Avatar.tsx';
import type { AvatarOptions } from './options.ts';

/** Self-contained HTML for SSR, emails and static sites. */
export function renderAvatarHTML(options: AvatarOptions = {}): string {
  return renderToString(h(Avatar, options));
}
