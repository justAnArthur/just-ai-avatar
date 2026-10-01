import type { AvatarOptions } from './options.ts';
import { renderAvatarSVG } from './svg.ts';

export type ExportFormat = 'svg' | 'png' | 'jpeg';

export interface ExportOptions {
  format?: ExportFormat;
  /** Output width and height in px. */
  size?: number;
  /** JPEG has no transparency, so the tile's rounded corners get this color. */
  background?: string;
  /** JPEG quality, 0–1. */
  quality?: number;
}

/** Renders an avatar to an SVG, PNG or JPEG Blob (browser only for PNG/JPEG). */
export async function avatarToBlob(options: AvatarOptions, { format = 'png', size = 512, background = '#ffffff', quality = 0.92 }: ExportOptions = {}): Promise<Blob> {
  const svg = renderAvatarSVG({ ...options, size });
  if (format === 'svg') return new Blob([svg], { type: 'image/svg+xml' });

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    if (format === 'jpeg') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.drawImage(img, 0, 0, size, size);

    return await new Promise<Blob>((done, fail) =>
      canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error('Canvas export failed'))), `image/${format}`, quality),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Renders and downloads an avatar as `<filename>.<svg|png|jpg>`. */
export async function downloadAvatar(options: AvatarOptions, exportOptions: ExportOptions & { filename?: string } = {}): Promise<void> {
  const { filename = 'ai-avatar', ...rest } = exportOptions;
  const format = rest.format ?? 'png';
  const blob = await avatarToBlob(options, rest);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${filename}.${format === 'jpeg' ? 'jpg' : format}` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
