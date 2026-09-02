import { createRoot } from 'react-dom/client';

import { AudioPlayer } from '../../react/src/presets/audio/player';
import { LiveAudioPlayer } from '../../react/src/presets/live-audio/player';
import { LiveVideoPlayer } from '../../react/src/presets/live-video/player';
import { VideoPlayer } from '../../react/src/presets/video/player';
import { createPreviewControls } from './controls';
import { assignHtmlMediaSource, defineHtmlMedia, renderHtmlMedia } from './html-media';
import { loadSkin } from './loaders';
import { readPreviewOptions } from './options';
import { ReactPreviewMedia } from './react-media';
import { installErrorLog } from './report';

import './styles.css';

installErrorLog();

const captions = new URL('./captions.vtt', import.meta.url).href;
const preview = readPreviewOptions();

document.documentElement.dataset.colorScheme = preview.colorScheme;

const Skin = await loadSkin(preview);

if (preview.styleMode === 'tailwind') await import('../src/styles/tailwind.dev.css');

type PreviewRoot = HTMLElement & { __videojsSkinsReactRoot?: ReturnType<typeof createRoot> };

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Expected the skin preview root to exist.');

const root: PreviewRoot = rootElement;

root.dataset.mediaKind = preview.isAudio ? 'audio' : 'video';
root.__videojsSkinsReactRoot?.unmount();
delete root.__videojsSkinsReactRoot;

const controls = createPreviewControls(preview, (width) => {
  root.style.setProperty('--preview-player-width', `${width}px`);
});

root.before(controls.options, controls.width);

if (preview.framework === 'react') {
  // SAFETY: VJSC transforms the selected React target into a React component before the module loads.
  renderReact(<App Skin={Skin as React.ComponentType<React.PropsWithChildren<{ className?: string }>>} />);
} else {
  if (preview.isAudio && preview.isLive) await import('../../html/src/define/live-audio/player');
  else if (preview.isAudio) await import('../../html/src/define/audio/player');
  else if (preview.isLive) await import('../../html/src/define/live-video/player');
  else await import('../../html/src/define/video/player');

  const mediaOptions = { ...preview, captions };

  await defineHtmlMedia(mediaOptions);

  // SAFETY: VJSC transforms the selected HTML target into a string-rendering function before the module loads.
  const render = Skin as (props?: { className?: string }) => { toString(): string };
  const posterAttribute = preview.poster ? ` poster="${escapeAttribute(preview.poster)}"` : '';
  const output = String(render({ className: 'preview-player' })).replace(
    '<slot></slot>',
    renderHtmlMedia(mediaOptions)
  );
  const playerTag = preview.isAudio
    ? preview.isLive
      ? 'live-audio-player'
      : 'audio-player'
    : preview.isLive
      ? 'live-video-player'
      : 'video-player';

  root.innerHTML = `<${playerTag}${posterAttribute}>${output}</${playerTag}>`;
  assignHtmlMediaSource(root, preview.media.source);
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
