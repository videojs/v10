import { createRoot } from 'react-dom/client';

import {
  SOURCE_IDS,
  SOURCES,
  getPosterSrc,
  getStoryboardSrc,
  type SandboxSource,
} from '../../../apps/sandbox/app/shared/sources';
import { DashVideo } from '../../react/src/media/dash-video';
import { MuxVideo } from '../../react/src/media/mux-video';
import { Video } from '../../react/src/media/video';
import { VideoPlayer } from '../../react/src/presets/video/player';

import './styles.css';

const captions = new URL('./captions.vtt', import.meta.url).href;

const previewWidth = {
  default: 960,
  max: 960,
  min: 240,
  presets: [
    { label: '24rem', value: 384 },
    { label: '32rem', value: 512 },
    { label: '42rem', value: 672 },
    { label: '60rem', value: 960 },
  ],
} as const;

const errorSource = {
  label: 'Unsupported source (error dialog)',
  url: '/missing-video-that-does-not-exist.mp4',
  type: 'mp4',
} satisfies SandboxSource;
const mediaIds = [...SOURCE_IDS, 'error'] as const;

type MediaId = (typeof mediaIds)[number];

const modules = {
  'react/default-video/css': () =>
    import('../vjsc/skins/default-video/skin.tsx?style=css&target=react&skin=default-video'),
  'react/default-video/tailwind': () =>
    import('../vjsc/skins/default-video/skin.tsx?style=tailwind&target=react&skin=default-video'),
  'react/minimal-video/css': () =>
    import('../vjsc/skins/minimal-video/skin.tsx?style=css&target=react&skin=minimal-video'),
  'react/minimal-video/tailwind': () =>
    import('../vjsc/skins/minimal-video/skin.tsx?style=tailwind&target=react&skin=minimal-video'),
  'html/default-video/css': () =>
    import('../vjsc/skins/default-video/skin.tsx?style=css&target=html&skin=default-video'),
  'html/default-video/tailwind': () =>
    import('../vjsc/skins/default-video/skin.tsx?style=tailwind&target=html&skin=default-video'),
  'html/minimal-video/css': () =>
    import('../vjsc/skins/minimal-video/skin.tsx?style=css&target=html&skin=minimal-video'),
  'html/minimal-video/tailwind': () =>
    import('../vjsc/skins/minimal-video/skin.tsx?style=tailwind&target=html&skin=minimal-video'),
} as const;

type ModuleKey = keyof typeof modules;

const params = new URLSearchParams(location.search);
const source = params.get('source') === 'legacy' ? 'legacy' : 'vjsc';
const framework = params.get('framework') === 'html' ? 'html' : 'react';
const skin = params.get('skin') === 'minimal-video' ? 'minimal-video' : 'default-video';
const styleMode = source === 'vjsc' && params.get('style') === 'tailwind' ? 'tailwind' : 'css';
const key: ModuleKey = `${framework}/${skin}/${styleMode}`;
const requestedMedia = params.get('media');
const mediaId = isMediaId(requestedMedia) ? requestedMedia : 'mp4-1';
const requestedWidth = Number.parseInt(params.get('width') ?? '', 10);
const playerWidth = Number.isFinite(requestedWidth)
  ? Math.min(previewWidth.max, Math.max(previewWidth.min, requestedWidth))
  : previewWidth.default;
const sourceId = mediaId === 'error' ? null : mediaId;
const media: SandboxSource = sourceId ? SOURCES[sourceId] : errorSource;
const poster = sourceId ? getPosterSrc(sourceId) : undefined;
const storyboard = sourceId ? getStoryboardSrc(sourceId) : undefined;
const loaded = source === 'vjsc' ? await modules[key]() : null;

if (source === 'vjsc' && styleMode === 'tailwind') await import('../vjsc/styles/tailwind.compiler.css');

function App({ Skin }: { Skin: React.ComponentType<React.PropsWithChildren<{ className?: string }>> }) {
  return (
    <VideoPlayer poster={poster}>
      <Skin className="preview-player">{renderReactMedia()}</Skin>
    </VideoPlayer>
  );
}

type PreviewRoot = HTMLElement & { __videojsSkinsReactRoot?: ReturnType<typeof createRoot> };

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Expected the skin preview root to exist.');

const root: PreviewRoot = rootElement;

root.__videojsSkinsReactRoot?.unmount();
delete root.__videojsSkinsReactRoot;
const controls = createPreviewControls();
const widthControl = createWidthControl();

root.before(controls, widthControl);
setPlayerWidth(playerWidth);

if (source === 'legacy') {
  await renderLegacy(framework, skin);
} else if (framework === 'react') {
  if (!loaded) throw new Error(`VJSC module \`${key}\` was not loaded.`);

  const Skin =
    'DefaultVideoSkin' in loaded
      ? loaded.DefaultVideoSkin
      : 'MinimalVideoSkin' in loaded
        ? loaded.MinimalVideoSkin
        : null;
  if (!Skin) throw new Error(`React Skin module \`${key}\` did not export a Skin component.`);

  // SAFETY: VJSC transforms the selected React target into a React component before the module loads.
  renderReact(<App Skin={Skin as React.ComponentType<React.PropsWithChildren<{ className?: string }>>} />);
} else {
  if (!loaded) throw new Error(`VJSC module \`${key}\` was not loaded.`);

  const Skin =
    'DefaultVideoSkin' in loaded
      ? loaded.DefaultVideoSkin
      : 'MinimalVideoSkin' in loaded
        ? loaded.MinimalVideoSkin
        : null;
  if (!Skin) throw new Error(`HTML Skin module \`${key}\` did not export a Skin component.`);

  await import('../../html/src/define/video/player');
  await defineHtmlMedia();

  // SAFETY: VJSC transforms the selected HTML target into a string-rendering function before the module loads.
  const render = Skin as (props?: { className?: string }) => { toString(): string };
  const posterAttribute = poster ? ` poster="${escapeAttribute(poster)}"` : '';
  const skin = String(render({ className: 'preview-player' })).replace('<slot></slot>', renderHtmlMedia());

  root.innerHTML = `<video-player${posterAttribute}>${skin}</video-player>`;
  assignHtmlMediaSource();
}

async function renderLegacy(framework: 'react' | 'html', skin: 'default-video' | 'minimal-video') {
  if (framework === 'react') {
    await (skin === 'default-video' ? import('../src/default/css/video.css') : import('../src/minimal/css/video.css'));

    if (skin === 'default-video') {
      const { VideoSkin } = await import('../../react/src/presets/video/skin');

      renderReact(
        <VideoPlayer poster={poster}>
          <VideoSkin className="preview-player">{renderReactMedia()}</VideoSkin>
        </VideoPlayer>
      );
    } else {
      const { MinimalVideoSkin } = await import('../../react/src/presets/video/minimal-skin');

      renderReact(
        <VideoPlayer poster={poster}>
          <MinimalVideoSkin className="preview-player">{renderReactMedia()}</MinimalVideoSkin>
        </VideoPlayer>
      );
    }

    return;
  }

  await import('../../html/src/define/video/player');
  await defineHtmlMedia();

  const tag = skin === 'default-video' ? 'video-skin' : 'video-minimal-skin';
  const posterAttribute = poster ? ` poster="${escapeAttribute(poster)}"` : '';

  if (skin === 'default-video') await import('../../html/src/define/video/skin');
  else await import('../../html/src/define/video/minimal-skin');

  root.innerHTML = `<video-player${posterAttribute}><${tag} class="preview-player">${renderHtmlMedia()}</${tag}></video-player>`;
  assignHtmlMediaSource();
}

function renderReactMedia() {
  const tracks = (
    <>
      <track kind="subtitles" label="English" src={captions} srcLang="en" />
      {media.chapters?.map(({ isDefault, label, lang, src }) => (
        <track key={lang} kind="chapters" label={label} src={src} srcLang={lang} default={isDefault} />
      ))}
      {storyboard ? <track kind="metadata" label="thumbnails" src={storyboard} default /> : null}
    </>
  );

  if (media.source) {
    return (
      <MuxVideo source={media.source} playsInline crossOrigin="anonymous">
        {tracks}
      </MuxVideo>
    );
  }

  if (media.type === 'dash') {
    return (
      <DashVideo src={media.url ?? ''} playsInline crossOrigin="anonymous">
        {tracks}
      </DashVideo>
    );
  }

  if (media.type === 'hls') {
    return (
      <MuxVideo src={media.url ?? ''} playsInline crossOrigin="anonymous">
        {tracks}
      </MuxVideo>
    );
  }

  return (
    <Video src={media.url ?? ''} playsInline crossOrigin="anonymous">
      {tracks}
    </Video>
  );
}

async function defineHtmlMedia() {
  if (media.source || media.type === 'hls') {
    await import('../../html/src/define/media/mux-video/hls-js');
  } else if (media.type === 'dash') {
    await import('../../html/src/define/media/dash-video');
  }
}

function renderHtmlMedia() {
  const tag = media.source
    ? 'mux-video'
    : media.type === 'dash'
      ? 'dash-video'
      : media.type === 'hls'
        ? 'mux-video'
        : 'video';
  const sourceAttribute = media.source || !media.url ? '' : ` src="${escapeAttribute(media.url)}"`;
  const chapterTracks =
    media.chapters
      ?.map(
        ({ isDefault, label, lang, src }) =>
          `<track kind="chapters" label="${escapeAttribute(label)}" src="${escapeAttribute(src)}" srclang="${escapeAttribute(lang)}"${isDefault ? ' default' : ''}>`
      )
      .join('') ?? '';
  const storyboardTrack = storyboard
    ? `<track kind="metadata" label="thumbnails" src="${escapeAttribute(storyboard)}" default>`
    : '';

  return `<${tag} id="preview-media"${sourceAttribute} playsinline crossorigin="anonymous"><track kind="subtitles" label="English" src="${escapeAttribute(captions)}" srclang="en">${chapterTracks}${storyboardTrack}</${tag}>`;
}

function assignHtmlMediaSource() {
  if (!media.source) return;

  const element = root.querySelector<HTMLElement & { source: typeof media.source }>('#preview-media');
  if (!element) throw new Error('Expected the structured-source media element to exist.');

  element.source = media.source;
}

function createPreviewControls() {
  const form = document.createElement('form');

  form.className = 'preview-controls';
  form.ariaLabel = 'Skin preview options';
  form.append(
    createSelect('source', 'Source', source, [
      ['vjsc', 'VJSC'],
      ['legacy', 'Legacy'],
    ]),
    createSelect('framework', 'Framework', framework, [
      ['react', 'React'],
      ['html', 'HTML'],
    ]),
    createSelect('skin', 'Skin', skin, [
      ['default-video', 'Default Video'],
      ['minimal-video', 'Minimal Video'],
    ]),
    createSelect(
      'style',
      'Styling',
      styleMode,
      [
        ['css', 'CSS'],
        ['tailwind', 'Tailwind'],
      ],
      source === 'legacy'
    ),
    createSelect(
      'media',
      'Media',
      mediaId,
      mediaIds.map((id) => [id, id === 'error' ? errorSource.label : SOURCES[id].label])
    ),
    createCopyButton()
  );
  form.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const next = new URLSearchParams(location.search);

    next.set(event.target.name, event.target.value);

    if (event.target.name === 'source' && event.target.value === 'legacy') next.set('style', 'css');

    location.search = next.toString();
  });

  return form;
}

function createWidthControl() {
  const section = document.createElement('section');
  const header = document.createElement('div');
  const label = document.createElement('label');
  const output = document.createElement('output');
  const range = document.createElement('input');
  const ticks = document.createElement('datalist');
  const presets = document.createElement('div');

  section.className = 'preview-width';
  section.ariaLabel = 'Player width';
  header.className = 'preview-width-header';
  label.htmlFor = 'preview-player-width';
  label.textContent = 'Player width';
  output.htmlFor = 'preview-player-width';
  range.id = 'preview-player-width';
  range.className = 'preview-width-range';
  range.type = 'range';
  range.min = String(previewWidth.min);
  range.max = String(previewWidth.max);
  range.step = '1';
  range.value = String(playerWidth);
  range.setAttribute('list', 'preview-player-breakpoints');
  ticks.id = 'preview-player-breakpoints';
  ticks.append(...previewWidth.presets.map(({ value }) => new Option('', String(value))));
  presets.className = 'preview-width-presets';

  const buttons = previewWidth.presets.map(({ label: text, value }) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = `${text} · ${value}px`;
    button.addEventListener('click', () => update(value));
    presets.append(button);
    return { button, value };
  });
  const update = (value: number) => {
    const width = Math.min(previewWidth.max, Math.max(previewWidth.min, value));
    const next = new URLSearchParams(location.search);

    range.value = String(width);
    output.value = `${width}px · ${formatRem(width)}`;
    setPlayerWidth(width);

    for (const preset of buttons) preset.button.ariaPressed = String(preset.value === width);

    next.set('width', String(width));
    history.replaceState(null, '', `${location.pathname}?${next}${location.hash}`);
  };

  range.addEventListener('input', () => update(range.valueAsNumber));
  header.append(label, output);
  section.append(header, range, ticks, presets);
  update(playerWidth);

  return section;
}

function createCopyButton() {
  const button = document.createElement('button');

  button.className = 'preview-copy';
  button.type = 'button';
  button.textContent = 'Copy details';
  button.addEventListener('click', async () => {
    const details = [
      'Video.js skins preview',
      `URL: ${location.href}`,
      `source=${source}`,
      `framework=${framework}`,
      `skin=${skin}`,
      `style=${styleMode}`,
      `media=${mediaId} (${media.label})`,
      `width=${getPlayerWidth()}px (${formatRem(getPlayerWidth())})`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(details);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }

    setTimeout(() => {
      button.textContent = 'Copy details';
    }, 3000);
  });

  return button;
}

function createSelect(
  name: string,
  labelText: string,
  value: string,
  options: readonly (readonly [value: string, label: string])[],
  disabled = false
) {
  const label = document.createElement('label');
  const text = document.createElement('span');
  const select = document.createElement('select');

  label.className = `preview-control preview-control-${name}`;
  text.textContent = labelText;
  select.name = name;
  select.disabled = disabled;
  select.append(
    ...options.map(([optionValue, optionLabel]) => new Option(optionLabel, optionValue, false, optionValue === value))
  );
  label.append(text, select);

  return label;
}

function isMediaId(value: string | null): value is MediaId {
  return value === 'error' || (value !== null && Object.hasOwn(SOURCES, value));
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function setPlayerWidth(width: number) {
  root.style.setProperty('--preview-player-width', `${width}px`);
}

function getPlayerWidth() {
  return Number.parseInt(root.style.getPropertyValue('--preview-player-width'), 10) || previewWidth.default;
}

function formatRem(width: number) {
  return `${Math.round((width / 16) * 100) / 100}rem`;
}

function renderReact(children: React.ReactNode) {
  root.__videojsSkinsReactRoot?.unmount();
  const reactRoot = createRoot(root);

  root.__videojsSkinsReactRoot = reactRoot;
  reactRoot.render(children);
}

import.meta.hot?.dispose(() => {
  root.__videojsSkinsReactRoot?.unmount();
  delete root.__videojsSkinsReactRoot;
  controls.remove();
  widthControl.remove();
});
