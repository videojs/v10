import { createRoot } from 'react-dom/client';

import { AudioPlayer } from '../../react/src/presets/audio/player';
import { LiveAudioPlayer } from '../../react/src/presets/live-audio/player';
import { LiveVideoPlayer } from '../../react/src/presets/live-video/player';
import { VideoPlayer } from '../../react/src/presets/video/player';
import { createPreviewControls } from './controls';
import { assignHtmlMediaSource, defineHtmlMedia, renderHtmlMedia } from './html-media';
import { loadSkin } from './loaders';
import { type PreviewOptions, readPreviewOptions, type StyleMode } from './options';
import { ReactPreviewMedia } from './react-media';
import { installErrorLog } from './report';

import './styles.css';

installErrorLog();

const captions = new URL('./captions.vtt', import.meta.url).href;
const preview = readPreviewOptions();

document.documentElement.dataset.colorScheme = preview.colorScheme;
document.documentElement.dir = preview.direction;

const variants: readonly PreviewOptions[] = preview.compare
  ? [
      { ...preview, styleMode: 'css' },
      { ...preview, styleMode: 'tailwind' },
    ]
  : [preview];
const skins = await Promise.all(variants.map((variant) => loadSkin(variant)));

if (variants.some((variant) => variant.styleMode === 'tailwind')) await import('../src/styles/tailwind.dev.css');

type PreviewRoot = HTMLElement & { __videojsSkinsReactRoot?: ReturnType<typeof createRoot> };
type ReactSkin = React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
type HtmlSkin = (props?: { className?: string }) => { toString(): string };

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Expected the skin preview root to exist.');

const root: PreviewRoot = rootElement;

root.dataset.mediaKind = preview.isAudio ? 'audio' : 'video';

if (preview.compare) root.dataset.compare = 'styles';

root.__videojsSkinsReactRoot?.unmount();
delete root.__videojsSkinsReactRoot;

const controls = createPreviewControls(preview, (width) => {
  root.style.setProperty('--preview-player-width', `${width}px`);
});

root.before(controls.options, controls.width);

if (preview.framework === 'react') {
  renderReact(
    <>
      {variants.map((variant, index) => (
        // SAFETY: VJSC transforms the selected React target into a React component before the module loads.
        <PreviewVariant key={variant.styleMode} variant={variant} Skin={skins[index] as ReactSkin} />
      ))}
    </>
  );
} else {
  if (preview.isAudio && preview.isLive) await import('../../html/src/define/live-audio/player');
  else if (preview.isAudio) await import('../../html/src/define/audio/player');
  else if (preview.isLive) await import('../../html/src/define/live-video/player');
  else await import('../../html/src/define/video/player');

  const mediaOptions = { ...preview, captions };

  await defineHtmlMedia(mediaOptions);

  const posterAttribute = preview.poster ? ` poster="${escapeAttribute(preview.poster)}"` : '';
  const playerTag = preview.isAudio
    ? preview.isLive
      ? 'live-audio-player'
      : 'audio-player'
    : preview.isLive
      ? 'live-video-player'
      : 'video-player';

  root.innerHTML = variants
    .map((variant, index) => {
      // SAFETY: VJSC transforms the selected HTML target into a string-rendering function before the module loads.
      const render = skins[index] as HtmlSkin;
      const output = String(render({ className: 'preview-player' })).replace(
        '<slot></slot>',
        renderHtmlMedia(mediaOptions)
      );
      const player = `<${playerTag}${posterAttribute}>${output}</${playerTag}>`;

      return preview.compare ? compareSection(variant.styleMode, player) : player;
    })
    .join('');
  assignHtmlMediaSource(root, preview.media.source);
}

function PreviewVariant({ variant, Skin }: { variant: PreviewOptions; Skin: ReactSkin }) {
  const app = <App Skin={Skin} />;

  if (!preview.compare) return app;

  return (
    <section className="preview-compare-item" data-style={variant.styleMode}>
      <h2>{styleLabel(variant.styleMode)}</h2>
      {app}
    </section>
  );
}

function compareSection(styleMode: StyleMode, player: string): string {
  return `<section class="preview-compare-item" data-style="${styleMode}"><h2>${styleLabel(styleMode)}</h2>${player}</section>`;
}

function styleLabel(styleMode: StyleMode): string {
  return styleMode === 'css' ? 'CSS' : 'Tailwind';
}

function App({ Skin }: { Skin: React.ComponentType<React.PropsWithChildren<{ className?: string }>> }) {
  const content = (
    <Skin className="preview-player">
      <ReactPreviewMedia {...preview} captions={captions} />
    </Skin>
  );

  if (preview.isAudio) {
    return preview.isLive ? <LiveAudioPlayer>{content}</LiveAudioPlayer> : <AudioPlayer>{content}</AudioPlayer>;
  }

  if (preview.isLive) return <LiveVideoPlayer poster={preview.poster}>{content}</LiveVideoPlayer>;

  return <VideoPlayer poster={preview.poster}>{content}</VideoPlayer>;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function renderReact(children: React.ReactNode): void {
  root.__videojsSkinsReactRoot?.unmount();
  const reactRoot = createRoot(root);

  root.__videojsSkinsReactRoot = reactRoot;
  reactRoot.render(children);
}

import.meta.hot?.dispose(() => {
  root.__videojsSkinsReactRoot?.unmount();
  delete root.__videojsSkinsReactRoot;
  controls.options.remove();
  controls.width.remove();
});
