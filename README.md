# just-ai-avatar

**[Live playground →](https://just-ai-avatar.vercel.app)**

Glowing AI avatars in plain HTML + CSS, as a Preact component. No images, no SVG, no stylesheet:
every part is a div with inline styles, so it also renders to static HTML.

```bash
bun add @justanarthur/just-ai-avatar preact
```

Develop:

```bash
bun install
bun run dev        # playground at http://localhost:3000
bun test
bun run build      # library → dist/
bun run build:playground
```

The playground uses [Fluid Functionalism](https://www.fluidfunctionalism.com/) components and tokens
(InputMessage, Slider, Tabs, Switch, Button), installed with the shadcn CLI into `playground/components`.
They are React components running on Preact through `preact/compat` (`react` is aliased to `@preact/compat`).
To add another one:

```bash
bunx --bun shadcn@latest add https://www.fluidfunctionalism.com/r/base/<component>.json
```

The CLI puts some files in `src/components/ui`; move them to `playground/components/ui`.

## Use

```tsx
import { Avatar } from '@justanarthur/just-ai-avatar';

<Avatar seed="agent-42" size={96} />                      // same seed → same avatar
<Avatar body="hexagon" eyes="wink" palette="grape" animate={['blink', 'float']} />
<Avatar hue={150} body="arch" eyes={['round', 'happy']} />
```

Static HTML (SSR, emails, static sites):

```ts
import { renderAvatarHTML } from '@justanarthur/just-ai-avatar/server';
const html = renderAvatarHTML({ seed: 'bob', size: 64 });
```

Without JSX, as a web component:

```html
<script type="module">
  import { defineAvatarElement } from '@justanarthur/just-ai-avatar/element';
  defineAvatarElement();
</script>
<ai-avatar seed="agent-42" body="triangle" eyes="oval happy" animate="blink"></ai-avatar>
```

## Export: SVG, PNG, JPEG

`renderAvatarSVG` draws the same avatar as real vector shapes (paths, gradients, blur filters, hex colors
only), so the file opens in Figma, Illustrator and Inkscape. It works on the server too.

```ts
import { renderAvatarSVG } from '@justanarthur/just-ai-avatar';
const svg = renderAvatarSVG({ seed: 'bob', size: 512 });
```

In the browser, PNG and JPEG are rendered from that SVG onto a canvas:

```ts
import { avatarToBlob, downloadAvatar } from '@justanarthur/just-ai-avatar/export';

const png = await avatarToBlob({ seed: 'bob' }, { format: 'png', size: 1024 });
await downloadAvatar({ seed: 'bob' }, { format: 'jpeg', size: 512, background: '#fff', filename: 'bob' });
```

JPEG has no transparency, so the tile's rounded corners are filled with `background`.

## Options

| Option | Values | Default |
|---|---|---|
| `seed` | any string | – |
| `size` | px number or any CSS length | `160` |
| `palette` | `sky` `mint` `lime` `sun` `peach` `coral` `rose` `grape` `indigo` `slate` `night` | `sky` |
| `hue` | 0–359, OKLCH hue (overrides palette; sky is 233) | – |
| `saturation` | 0–100 | `100` |
| `colors` | full override, see `colorsFromHue()` | – |
| `tile` | `squircle` `rounded` `circle` `square` `none`, or any CSS radius | `squircle` |
| `body` | `dome` `peek` `wide` `arch` `square` `triangle` `diamond` `hexagon` | `dome` |
| `eyes` | `oval` `round` `tall` `dot` `square` `pill` `happy` `wink`, or `[left, right]` | `oval` |
| `tilt` | head tilt in degrees | `12` |
| `spacing` / `eyeScale` | multipliers | `1` |
| `gazeX` / `gazeY` | -1 … 1 | `0` |
| `animate` | any of `blink` `float` `look`, or `true` | `[]` |
| `label` | accessible name | `AI avatar` |

Explicit options override what a seed picks. Web component attributes use kebab-case (`eye-scale`, `gaze-x`).
Animations respect `prefers-reduced-motion`.

## Adding shapes

Bodies live in `src/shapes.ts`. Each one is a box in % of the tile, which must overflow the tile so the tile crops
it (a test enforces this), plus a shape: a CSS `radius`, or polygon `points` with a `round` corner size.
`core` is the glow inside the body and `face` is the point between the eyes.

```ts
pentagon: {
  box: { x: -6, y: 24, w: 112, h: 110 },
  shape: { points: [[50, 0], [100, 38], [82, 100], [18, 100], [0, 38]], round: 12 },
  core: { cx: 50, cy: 52, w: 74, h: 70 },
  face: { x: 52, y: 36 },
  scale: 0.9,
},
```

Needs container query units (`cqw`): Chrome 105+, Safari 16+, Firefox 110+.

## Releases

Releases use [just-github-actions-n-workflows](https://github.com/justAnArthur/just-github-actions-n-workflows)
(`bump-version` + `publish-npm-on-tag`). Commits with the `avatar` or `lib` scope bump the version on push
to `main`: `fix(avatar): …` → patch, `feat(avatar): …` → minor. The bump pushes a
`@justanarthur/just-ai-avatar@x.y.z` tag, and `publish-npm-on-tag` builds and publishes it to npm and creates
the GitHub release. It needs an `NPM_TOKEN` repository secret.

Tags pushed with the default `GITHUB_TOKEN` don't start other workflows, so `publish-bumped-tags.yml` runs
after each `bump-version` and dispatches `publish-npm-on-tag` for the tags that run created. To publish a
past bump, run it by hand with the commit the bump ran on:

```bash
gh workflow run publish-bumped-tags.yml -f head_sha=<commit>
```
