import { render, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Check, Copy, Download, Moon, Shuffle, Sun } from 'lucide-react';
import {
  Avatar,
  type AvatarOptions,
  BODIES,
  type BodyName,
  DEFAULTS,
  EMOTIONS,
  type EmotionHandle,
  EYES,
  EYE_PAIRS,
  PALETTES,
  type PaletteName,
  TILES,
  type TileName,
  emotionName,
  optionsFromSeed,
  paletteColors,
  useEmotion,
} from '../src/index.ts';
import { type ExportFormat, downloadAvatar } from '../src/export.ts';
import { renderAvatarHTML } from '../src/server.ts';
import { renderAvatarSVG } from '../src/svg.ts';
import { Button } from '@/components/ui/button';
import { InputMessage } from '@/components/ui/input-message';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TabItem, Tabs, TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type State = Required<Omit<AvatarOptions, 'seed' | 'colors' | 'size' | 'label' | 'hue' | 'emotion' | 'emotionVariant'>> & {
  hue: number | null;
};
type ExportTab = 'jsx' | 'element' | 'html' | 'svg';
type Mood = Pick<EmotionHandle, 'emotion' | 'emotionKey'>;

const EXPORT_SIZES = ['256', '512', '1024'] as const;

const WORDS = ['nova', 'pixel', 'echo', 'atlas', 'byte', 'luna', 'orbit', 'sage', 'kiwi', 'zen', 'milo', 'aria',
  'flux', 'juno', 'onyx', 'pip', 'rho', 'iris', 'koda', 'vega', 'nimbus', 'bolt', 'opal', 'quill'];

const SLIDERS = [
  { key: 'tilt', label: 'Head tilt', min: -20, max: 20, step: 0.5, fmt: (v: number) => `${v}°` },
  { key: 'spacing', label: 'Eye spacing', min: 0.7, max: 1.35, step: 0.01, fmt: (v: number) => `${v.toFixed(2)}×` },
  { key: 'eyeScale', label: 'Eye size', min: 0.6, max: 1.4, step: 0.01, fmt: (v: number) => `${v.toFixed(2)}×` },
  { key: 'gazeX', label: 'Look sideways', min: -1, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
  { key: 'gazeY', label: 'Look up / down', min: -1, max: 1, step: 0.05, fmt: (v: number) => v.toFixed(2) },
] as const;

const INITIAL: State = {
  palette: 'sky', hue: null, saturation: 100, tile: 'squircle', body: 'dome', eyes: 'oval',
  tilt: 12, spacing: 1, eyeScale: 1, gazeX: 0, gazeY: 0, animate: true,
};

const EYE_OPTIONS = [...Object.keys(EYES), ...Object.keys(EYE_PAIRS)] as State['eyes'][];
const ATTR: Record<string, string> = { eyeScale: 'eye-scale', gazeX: 'gaze-x', gazeY: 'gaze-y' };

function randomSeed() {
  return `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * 1000)}`;
}

function failingRequest() {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('503 Service Unavailable')), 1200));
}

function changed(state: State): AvatarOptions {
  const defaults: Record<string, unknown> = DEFAULTS;
  return Object.fromEntries(
    Object.entries(state).filter(([k, v]) => {
      if (k === 'saturation' && state.hue == null) return false;
      if (k === 'palette' && state.hue != null) return false;
      return JSON.stringify(v) !== JSON.stringify(defaults[k]);
    }),
  );
}

function exportCode(state: State, tab: ExportTab) {
  if (tab === 'html') return renderAvatarHTML({ ...state, size: 96 });
  if (tab === 'svg') return renderAvatarSVG({ ...state, size: 96 });

  const opts = Object.entries(changed(state));
  if (tab === 'element') {
    const attrs = opts.map(([k, v]) => ` ${ATTR[k] ?? k}="${v}"`).join('');
    return `<script type="module">\n  import { defineAvatarElement } from '@justanarthur/just-ai-avatar/element';\n  defineAvatarElement();\n</script>\n\n<ai-avatar size="96"${attrs}></ai-avatar>`;
  }

  const props = opts.map(([k, v]) => (typeof v === 'string' ? ` ${k}="${v}"` : ` ${k}={${JSON.stringify(v)}}`)).join('');
  return `import { Avatar } from '@justanarthur/just-ai-avatar';\n\n<Avatar size={96}${props} />`;
}

const Card = (props: { caption: string; action?: ComponentChildren; class?: string; children: ComponentChildren }) => (
  <section class={cn('overflow-hidden rounded-2xl border border-border bg-surface-1', props.class)}>
    {props.children}
    <footer class="flex min-h-11 items-center justify-between gap-3 border-t border-border px-3 py-1.5 text-[13px] text-muted-foreground">
      <span>{props.caption}</span>
      {props.action}
    </footer>
  </section>
);

const Section = (props: { title: string; value?: string; children: ComponentChildren }) => (
  <div class="flex flex-col gap-2.5">
    <div class="flex items-baseline justify-between text-[13px]">
      <span class="text-foreground" style={{ fontVariationSettings: "'wght' 550, 'opsz' 18" }}>{props.title}</span>
      {props.value && <span class="tabular-nums text-muted-foreground">{props.value}</span>}
    </div>
    {props.children}
  </div>
);

const Picker = <K extends 'body' | 'eyes'>(props: { options: State[K][]; state: State; field: K; onPick: (v: State[K]) => void }) => (
  <div class="grid grid-cols-4 gap-1">
    {props.options.map((opt) => (
      <button
        key={String(opt)}
        type="button"
        aria-pressed={props.state[props.field] === opt}
        onClick={() => props.onPick(opt)}
        class={cn(
          'flex cursor-pointer flex-col items-center gap-1 rounded-xl px-1 pt-1.5 pb-1 text-[11px] transition-colors',
          props.state[props.field] === opt ? 'bg-[var(--active)] text-foreground' : 'text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
        )}
      >
        <Avatar {...props.state} {...{ [props.field]: opt }} animate={false} size={44} />
        {String(opt)}
      </button>
    ))}
  </div>
);

const MoodCard = ({ mood, animate, onAnimate }: { mood: ReturnType<typeof useEmotion>; animate: boolean; onAnimate: () => void }) => {
  const [hold, setHold] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const current = emotionName(mood.emotion);

  const simulate = async () => {
    setRequesting(true);
    mood.emote('loading', Infinity);
    try {
      await failingRequest();
    } catch {
      mood.emote('error');
    }
    setRequesting(false);
  };

  return (
    <Card
      caption={current ? `Feeling ${current} · each seed shows it its own way` : 'Calm · blinking, floating, looking around'}
      action={
        <div class="flex items-center gap-4">
          <Switch label="Animate" checked={animate} onToggle={onAnimate} size="compact" />
          <Switch label="Hold" checked={hold} onToggle={() => { setHold(!hold); mood.calm(); }} size="compact" />
        </div>
      }
    >
      <div class="flex flex-col gap-3 p-3">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
          <Button size="compact" variant={current ? 'secondary' : 'primary'} onClick={mood.calm}>calm</Button>
          {EMOTIONS.map((e) => (
            <Button key={e} size="compact" variant={current === e ? 'primary' : 'secondary'} onClick={() => mood.emote(e, hold ? Infinity : undefined)}>
              {e}
            </Button>
          ))}
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
          <span>From your app: <code class="text-foreground">mood.emote('error')</code></span>
          <Button size="compact" variant="ghost" loading={requesting} onClick={simulate}>Simulate a failed request</Button>
        </div>
      </div>
    </Card>
  );
};

const ExportCard = ({ state, seed }: { state: State; seed: string | null }) => {
  const [tab, setTab] = useState<ExportTab>('jsx');
  const [size, setSize] = useState<(typeof EXPORT_SIZES)[number]>('512');
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => exportCode(state, tab), [state, tab]);

  const download = async (format: ExportFormat) => {
    setDownloading(format);
    await downloadAvatar(state, { format, size: +size, filename: seed ? `avatar-${seed}` : 'avatar' }).finally(() => setDownloading(null));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Card caption="Export" action={<Button size="compact" variant="ghost" leadingIcon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>}>
      <div class="flex flex-col gap-3 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={size} onValueChange={(v) => setSize(v as typeof size)} size="compact">
            <TabsList>{EXPORT_SIZES.map((px) => <TabItem key={px} value={px} label={`${px}px`} />)}</TabsList>
          </Tabs>
          <div class="flex gap-1.5">
            {(['png', 'jpeg', 'svg'] as const).map((format) => (
              <Button key={format} size="compact" variant="secondary" leadingIcon={Download} loading={downloading === format} onClick={() => download(format)}>
                {format.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as ExportTab)}>
          <TabsList>
            <TabItem value="jsx" label="Preact" />
            <TabItem value="element" label="Web component" />
            <TabItem value="html" label="Static HTML" />
            <TabItem value="svg" label="SVG" />
          </TabsList>
        </Tabs>
        <pre class="m-0 max-h-60 overflow-auto rounded-xl bg-surface-2 p-3.5 font-mono text-[12px] leading-relaxed break-all whitespace-pre-wrap text-foreground shadow-surface-1">
          {code}
        </pre>
      </div>
    </Card>
  );
};

const GalleryCard = ({ mood, animate, onPick }: { mood: Mood; animate: boolean; onPick: (seed: string) => void }) => {
  const [seeds, setSeeds] = useState(() => Array.from({ length: 18 }, randomSeed));

  return (
    <Card
      caption="From seeds · every seed always gives the same avatar"
      action={<Button size="compact" variant="ghost" leadingIcon={Shuffle} onClick={() => setSeeds(Array.from({ length: 18 }, randomSeed))}>Shuffle</Button>}
    >
      <div class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1 p-3">
        {seeds.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            class="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 pt-2.5 pb-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
          >
            <Avatar seed={s} size={60} animate={animate} {...mood} />
            <span class="max-w-full truncate">{s}</span>
          </button>
        ))}
      </div>
    </Card>
  );
};

const CustomizeCard = ({ state, set }: { state: State; set: (patch: Partial<State>) => void }) => {
  const palette = PALETTES[state.palette];
  const hue = state.hue ?? ('hue' in palette ? palette.hue : 270);

  return (
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
                  class={cn('size-7 cursor-pointer rounded-lg shadow-surface-1 transition-transform hover:scale-110', active && 'ring-2 ring-foreground ring-offset-2 ring-offset-[var(--background)]')}
                  style={{ background: `linear-gradient(180deg, ${c.bgTop} 0 45%, ${c.rim} 45% 60%, ${c.core} 60%)` }}
                />
              );
            })}
          </div>
          <Slider value={hue} onChange={(v) => set({ hue: v as number })} min={0} max={359} step={1} label="Hue" size="compact" showValue={false} hideFill
            trackStyle={{ background: 'linear-gradient(90deg in oklch longer hue, oklch(.75 .15 0), oklch(.75 .15 359))' }} />
          <Slider value={state.saturation} onChange={(v) => set({ saturation: v as number, hue })} min={0} max={100} step={1} label="Saturation" formatValue={(v) => `${v}%`} />
        </Section>

        <Section title="Body" value={state.body}>
          <Picker options={Object.keys(BODIES) as BodyName[]} state={state} field="body" onPick={(body) => set({ body })} />
        </Section>

        <Section title="Eyes" value={String(state.eyes)}>
          <Picker options={EYE_OPTIONS} state={state} field="eyes" onPick={(eyes) => set({ eyes })} />
        </Section>

        <Section title="Tile">
          <Tabs value={state.tile} onValueChange={(t) => set({ tile: t as TileName })} size="compact">
            <TabsList>{(Object.keys(TILES) as TileName[]).map((t) => <TabItem key={t} value={t} label={t} />)}</TabsList>
          </Tabs>
        </Section>

        <Section title="Shape">
          <div class="flex flex-col gap-3">
            {SLIDERS.map((s) => (
              <Slider key={s.key} value={state[s.key]} onChange={(v) => set({ [s.key]: v as number })} min={s.min} max={s.max} step={s.step} label={s.label} formatValue={s.fmt} />
            ))}
          </div>
        </Section>
      </div>
    </Card>
  );
};

const App = () => {
  const [state, setState] = useState<State>(INITIAL);
  const [seed, setSeed] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [suggestion, setSuggestion] = useState(randomSeed);
  const [size, setSize] = useState(240);
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const mood = useEmotion();
  const moodProps: Mood = { emotion: mood.emotion, emotionKey: mood.emotionKey };

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const applySeed = (value: string) => {
    const s = value.trim() || randomSeed();
    setSeed(s);
    setDraft('');
    setSuggestion(randomSeed());
    set({ ...optionsFromSeed(s), saturation: 100 });
  };

  return (
    <div class="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6">
      <header class="flex flex-wrap items-end justify-between gap-6 pt-16 pb-10 sm:pt-24">
        <div>
          <h1 class="m-0 text-[28px] tracking-[-0.02em]" style={{ fontVariationSettings: "'wght' 650, 'opsz' 28" }}>Just AI Avatar</h1>
          <p class="mt-1.5 mb-5 text-[15px] text-muted-foreground">Glowing AI avatars in plain HTML and CSS, with moods.</p>
          <Button size="compact" leadingIcon={Shuffle} onClick={() => applySeed(randomSeed())}>Randomize</Button>
        </div>
        <Button variant="ghost" size="icon-compact" aria-label="Toggle theme" leadingIcon={dark ? Sun : Moon} onClick={() => setDark(!dark)} />
      </header>

      <main class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="flex min-w-0 flex-col gap-4">
          <Card
            caption={seed ? `Seed · ${seed}` : 'Avatar'}
            action={
              <div class="flex w-56 items-center gap-3">
                <span class="shrink-0">Size</span>
                <div class="flex-1">
                  <Slider value={size} onChange={(v) => setSize(v as number)} min={64} max={320} step={8} label="Preview size" size="compact" showValue={false} />
                </div>
              </div>
            }
          >
            <div class="flex flex-col items-center gap-10 px-4 pt-14 pb-8">
              <div class="grid h-[320px] place-items-center">
                <Avatar {...state} size={size} {...moodProps} />
              </div>
              <div class="w-full max-w-[460px]">
                <InputMessage
                  value={draft}
                  onValueChange={setDraft}
                  onSend={applySeed}
                  placeholder="Type a seed: a name, a user id, anything"
                  placeholderSuggestion={suggestion}
                  sendLabel="Generate"
                  minRows={1}
                  maxRows={2}
                />
              </div>
            </div>
          </Card>

          <MoodCard mood={mood} animate={state.animate} onAnimate={() => set({ animate: !state.animate })} />
          <ExportCard state={state} seed={seed} />
          <GalleryCard mood={moodProps} animate={state.animate} onPick={applySeed} />
        </div>

        <CustomizeCard state={state} set={set} />
      </main>
    </div>
  );
};

render(<App />, document.getElementById('app')!);
