import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Check, Copy, Moon, Shuffle, Sun } from 'lucide-react';
import {
  Avatar,
  type AvatarOptions,
  BODIES,
  type BodyName,
  DEFAULTS,
  EYES,
  EYE_PAIRS,
  type Motion,
  PALETTES,
  type PaletteName,
  TILES,
  type TileName,
  optionsFromSeed,
  paletteColors,
} from '../src/index.ts';
import { renderAvatarHTML } from '../src/server.ts';
import { Button } from '@/components/ui/button';
import { InputMessage } from '@/components/ui/input-message';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TabItem, Tabs, TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type State = Required<Omit<AvatarOptions, 'seed' | 'colors' | 'size' | 'label' | 'animate' | 'hue'>> & {
  hue: number | null;
  animate: Motion[];
};
type ExportTab = 'jsx' | 'element' | 'html';

const WORDS = ['nova', 'pixel', 'echo', 'atlas', 'byte', 'luna', 'orbit', 'sage', 'kiwi', 'zen', 'milo', 'aria',
  'flux', 'juno', 'onyx', 'pip', 'rho', 'iris', 'koda', 'vega', 'nimbus', 'bolt', 'opal', 'quill'];
const randomSeed = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * 1000)}`;

const SLIDERS = [
  { key: 'tilt', label: 'Head tilt', min: -20, max: 20, step: 0.5, fmt: (v: number) => `${v}°` },
  { key: 'spacing', label: 'Eye spacing', min: 0.7, max: 1.35, step: 0.01, fmt: (v: number) => `${v.toFixed(2)}×` },
  { key: 'eyeScale', label: 'Eye size', min: 0.6, max: 1.4, step: 0.01, fmt: (v: number) => `${v.toFixed(2)}×` },
  { key: 'gazeX', label: 'Look sideways', min: -1, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
  { key: 'gazeY', label: 'Look up / down', min: -1, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
] as const;

const INITIAL: State = {
  palette: 'sky', hue: null, saturation: 100, tile: 'squircle', body: 'dome', eyes: 'oval',
  tilt: 12, spacing: 1, eyeScale: 1, gazeX: 0, gazeY: 0, animate: ['blink'],
};

const EYE_OPTIONS = [...Object.keys(EYES), ...Object.keys(EYE_PAIRS)] as State['eyes'][];

// ------------------------------------------------------------------ layout bits

/** Bordered card with a caption strip, like the Fluid Functionalism showcase. */
function Card(props: { caption: string; action?: preact.ComponentChildren; class?: string; children: preact.ComponentChildren }) {
  return (
    <section class={cn('overflow-hidden rounded-2xl border border-border bg-surface-1', props.class)}>
      {props.children}
      <footer class="flex min-h-11 items-center justify-between gap-3 border-t border-border px-3 py-1.5 text-[13px] text-muted-foreground">
        <span>{props.caption}</span>
        {props.action}
      </footer>
    </section>
  );
}

function Section(props: { title: string; value?: string; children: preact.ComponentChildren }) {
  return (
    <div class="flex flex-col gap-2.5">
      <div class="flex items-baseline justify-between text-[13px]">
        <span class="text-foreground" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>{props.title}</span>
        {props.value && <span class="tabular-nums text-muted-foreground">{props.value}</span>}
      </div>
      {props.children}
    </div>
  );
}

function Picker<K extends 'body' | 'eyes'>(props: {
  options: State[K][];
  state: State;
  field: K;
  onPick: (v: State[K]) => void;
}) {
  return (
    <div class="grid grid-cols-4 gap-1">
      {props.options.map((opt) => {
        const active = props.state[props.field] === opt;
        return (
          <button
            key={String(opt)}
            type="button"
            aria-pressed={active}
            onClick={() => props.onPick(opt)}
            class={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-xl px-1 pt-1.5 pb-1 text-[11px] transition-colors',
              active ? 'bg-[var(--active)] text-foreground' : 'text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
            )}
          >
            <Avatar {...props.state} {...{ [props.field]: opt }} animate={[]} size={44} />
            {String(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ app

function App() {
  const [state, setState] = useState<State>(INITIAL);
  const [seed, setSeed] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [suggestion, setSuggestion] = useState(randomSeed);
  const [size, setSize] = useState(240);
  const [tab, setTab] = useState<ExportTab>('jsx');
  const [copied, setCopied] = useState(false);
  const [gallery, setGallery] = useState(() => Array.from({ length: 18 }, randomSeed));
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const applySeed = (value: string) => {
    const s = value.trim() || randomSeed();
    setSeed(s);
    setDraft('');
    setSuggestion(randomSeed());
    setState((prev) => ({ ...prev, ...optionsFromSeed(s), saturation: 100 }));
  };

  const palette = PALETTES[state.palette];
  const hue = state.hue ?? ('hue' in palette ? palette.hue : 270);
  const code = useMemo(() => exportCode(state, tab), [state, tab]);

  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6">
      <header class="flex flex-wrap items-end justify-between gap-6 pt-16 pb-10 sm:pt-24">
        <div>
          <h1 class="m-0 text-[28px] tracking-[-0.02em]" style={{ fontVariationSettings: "'wght' 650, 'opsz' 28" }}>
            Just AI Avatar
          </h1>
          <p class="mt-1.5 mb-5 text-[15px] text-muted-foreground">Glowing AI avatars in plain HTML and CSS.</p>
          <div class="flex gap-2">
            <Button size="compact" leadingIcon={Shuffle} onClick={() => applySeed(randomSeed())}>Randomize</Button>
            <Button size="compact" variant="secondary" leadingIcon={copied ? Check : Copy} onClick={copy}>
              {copied ? 'Copied' : 'Copy code'}
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon-compact" aria-label="Toggle theme" leadingIcon={dark ? Sun : Moon}
          onClick={() => setDark((d) => !d)} />
      </header>

      <main class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="flex min-w-0 flex-col gap-4">
          <Card
            caption={seed ? `Seed · ${seed}` : 'Avatar'}
            action={
              <div class="flex w-56 items-center gap-3">
                <span class="shrink-0">Size</span>
                <div class="flex-1">
                  <Slider value={size} onChange={(v) => setSize(v as number)} min={64} max={320} step={8}
                    label="Preview size" formatValue={(v) => `${v}px`} size="compact" showValue={false} />
                </div>
              </div>
            }
          >
            <div class="flex flex-col items-center gap-10 px-4 pt-14 pb-8">
              <div class="grid h-[320px] place-items-center">
                <Avatar {...state} size={size} />
              </div>
              <div class="w-full max-w-[460px]">
                <InputMessage
                  value={draft}
                  onValueChange={setDraft}
                  onSend={(v) => applySeed(v)}
                  placeholder="Type a seed: a name, a user id, anything"
                  placeholderSuggestion={suggestion}
                  sendLabel="Generate"
                  minRows={1}
                  maxRows={2}
                />
              </div>
            </div>
          </Card>

          <Card
            caption="Export"
            action={
              <Button size="compact" variant="ghost" leadingIcon={copied ? Check : Copy} onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            }
          >
            <div class="flex flex-col gap-3 p-3">
              <Tabs value={tab} onValueChange={(v) => setTab(v as ExportTab)}>
                <TabsList>
                  <TabItem value="jsx" label="Preact" />
                  <TabItem value="element" label="Web component" />
                  <TabItem value="html" label="Static HTML" />
                </TabsList>
              </Tabs>
              <pre class="m-0 max-h-60 overflow-auto rounded-xl bg-surface-2 p-3.5 font-mono text-[12px] leading-relaxed break-all whitespace-pre-wrap text-foreground shadow-surface-1">
                {code}
              </pre>
            </div>
          </Card>

          <Card
            caption="From seeds · every seed always gives the same avatar"
            action={
              <Button size="compact" variant="ghost" leadingIcon={Shuffle}
                onClick={() => setGallery(Array.from({ length: 18 }, randomSeed))}>
                Shuffle
              </Button>
            }
          >
            <div class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1 p-3">
              {gallery.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySeed(s)}
                  class="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 pt-2.5 pb-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
                >
                  <Avatar seed={s} size={60} />
                  <span class="max-w-full truncate">{s}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card caption="Customize" class="self-start">
          <div class="flex flex-col gap-6 p-4">
            <Section title="Color" value={state.hue == null ? state.palette : `hue ${state.hue}`}>
              <div class="flex flex-wrap gap-1.5">
                {(Object.keys(PALETTES) as PaletteName[]).map((name) => {
                  const c = paletteColors(name);
                  const p = PALETTES[name];
                  const active = state.hue == null && state.palette === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      aria-pressed={active}
                      onClick={() => set({ palette: name, hue: null, saturation: 'saturation' in p ? p.saturation : 100 })}
                      class={cn(
                        'size-7 cursor-pointer rounded-lg shadow-surface-1 transition-transform hover:scale-110',
                        active && 'ring-2 ring-foreground ring-offset-2 ring-offset-[var(--background)]',
                      )}
                      style={{ background: `linear-gradient(180deg, ${c.bgTop} 0 45%, ${c.rim} 45% 60%, ${c.core} 60%)` }}
                    />
                  );
                })}
              </div>
              <Slider value={hue} onChange={(v) => set({ hue: v as number })} min={0} max={359} step={1} label="Hue"
                size="compact" showValue={false} hideFill
                trackStyle={{ background: 'linear-gradient(90deg in oklch longer hue, oklch(.75 .15 0), oklch(.75 .15 359))' }} />
              <Slider value={state.saturation} onChange={(v) => set({ saturation: v as number, hue })} min={0} max={100}
                step={1} label="Saturation" formatValue={(v) => `${v}%`} />
            </Section>

            <Section title="Body" value={state.body}>
              <Picker options={Object.keys(BODIES) as BodyName[]} state={state} field="body" onPick={(body) => set({ body })} />
            </Section>

            <Section title="Eyes" value={String(state.eyes)}>
              <Picker options={EYE_OPTIONS} state={state} field="eyes" onPick={(eyes) => set({ eyes })} />
            </Section>

            <Section title="Tile">
              <Tabs value={state.tile} onValueChange={(t) => set({ tile: t as TileName })} size="compact">
                <TabsList>
                  {(Object.keys(TILES) as TileName[]).map((t) => <TabItem key={t} value={t} label={t} />)}
                </TabsList>
              </Tabs>
            </Section>

            <Section title="Shape">
              <div class="flex flex-col gap-3">
                {SLIDERS.map((s) => (
                  <Slider key={s.key} value={state[s.key]} onChange={(v) => set({ [s.key]: v as number })}
                    min={s.min} max={s.max} step={s.step} label={s.label} formatValue={s.fmt} />
                ))}
              </div>
            </Section>

            <Section title="Motion">
              <div class="flex flex-col gap-2">
                {(['blink', 'float', 'look'] as Motion[]).map((m) => (
                  <Switch
                    key={m}
                    label={m[0]!.toUpperCase() + m.slice(1)}
                    checked={state.animate.includes(m)}
                    onToggle={() => set({
                      animate: state.animate.includes(m) ? state.animate.filter((x) => x !== m) : [...state.animate, m],
                    })}
                  />
                ))}
              </div>
            </Section>
          </div>
        </Card>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ export code

/** Only the options that differ from the defaults. */
function changed(state: State): AvatarOptions {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (k === 'saturation' && state.hue == null) continue;
    if (k === 'palette' && state.hue != null) continue;
    if (JSON.stringify(v) !== JSON.stringify((DEFAULTS as Record<string, unknown>)[k])) out[k] = v;
  }
  return out;
}

const ATTR: Record<string, string> = { eyeScale: 'eye-scale', gazeX: 'gaze-x', gazeY: 'gaze-y' };

function exportCode(state: State, tab: ExportTab): string {
  const opts = changed(state);
  if (tab === 'html') return renderAvatarHTML({ ...state, size: 96 });

  if (tab === 'element') {
    const attrs = Object.entries(opts).map(([k, v]) => `${ATTR[k] ?? k}="${Array.isArray(v) ? v.join(' ') : v}"`);
    return `<script type="module">\n  import { defineAvatarElement } from 'just-ai-avatar/element';\n  defineAvatarElement();\n</script>\n\n<ai-avatar size="96"${attrs.map((a) => ` ${a}`).join('')}></ai-avatar>`;
  }

  const props = Object.entries(opts).map(([k, v]) => (typeof v === 'string' ? `${k}="${v}"` : `${k}={${JSON.stringify(v)}}`));
  return `import { Avatar } from 'just-ai-avatar';\n\n<Avatar size={96}${props.map((p) => ` ${p}`).join('')} />`;
}

render(<App />, document.getElementById('app')!);
