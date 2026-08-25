import { createRoot } from 'react-dom/client';

import { Video } from '../../react/src/media/video';
import { VideoPlayer } from '../../react/src/presets/video/player';

import './styles.css';

const media = {
  captions: new URL('./captions.vtt', import.meta.url).href,
  poster: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg',
  src: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
} as const;

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
const requested = `${params.get('framework') ?? 'react'}/${params.get('skin') ?? 'default-video'}/${params.get('style') ?? 'css'}`;
const key: ModuleKey = requested in modules ? (requested as ModuleKey) : 'react/default-video/css';
const [framework, skin, styleMode] = key.split('/') as [
  'react' | 'html',
  'default-video' | 'minimal-video',
  'css' | 'tailwind',
];
const loaded = source === 'vjsc' ? await modules[key]() : null;

if (source === 'vjsc' && styleMode === 'tailwind') await import('../vjsc/styles/tailwind.compiler.css');

function App({ Skin }: { Skin: React.ComponentType<React.PropsWithChildren<{ className?: string }>> }) {
  return (
    <VideoPlayer poster={media.poster}>
      <Skin className="preview-player">
        <Video src={media.src} playsInline crossOrigin="anonymous">
          <track kind="subtitles" label="English" src={media.captions} srcLang="en" />
        </Video>
      </Skin>
    </VideoPlayer>
  );
}

type PreviewRoot = HTMLElement & { __videojsSkinsReactRoot?: ReturnType<typeof createRoot> };

const root = document.getElementById('root') as PreviewRoot;

root.__videojsSkinsReactRoot?.unmount();
delete root.__videojsSkinsReactRoot;
const links = document.createElement('nav');

links.ariaLabel = 'Skin preview variants';
links.innerHTML = [
  ...Object.keys(modules).map((value) => ({ source: 'vjsc', value })),
  ...(
    ['react/default-video/css', 'react/minimal-video/css', 'html/default-video/css', 'html/minimal-video/css'] as const
  ).map((value) => ({ source: 'legacy', value })),
]
  .map(({ source: nextSource, value }) => {
    const [nextFramework, nextSkin, nextStyle] = value.split('/');
    const href = `?source=${nextSource}&framework=${nextFramework}&skin=${nextSkin}&style=${nextStyle}`;
    const current = nextSource === source && value === key;

    return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${nextSource}/${value}</a>`;
  })
  .join('');
root.before(links);

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
  const render = Skin as (props?: { className?: string }) => { toString(): string };
  const skin = String(render({ className: 'preview-player' })).replace(
    '<slot></slot>',
    `<video src="${media.src}" playsinline crossorigin="anonymous"><track kind="subtitles" label="English" src="${media.captions}" srclang="en"></video>`
  );

  root.innerHTML = `<video-player poster="${media.poster}">${skin}</video-player>`;
}

async function renderLegacy(framework: 'react' | 'html', skin: 'default-video' | 'minimal-video') {
  if (framework === 'react') {
    await (skin === 'default-video' ? import('../src/default/css/video.css') : import('../src/minimal/css/video.css'));

    if (skin === 'default-video') {
      const { VideoSkin } = await import('../../react/src/presets/video/skin');

      renderReact(
        <VideoPlayer poster={media.poster}>
          <VideoSkin className="preview-player">
            <Video src={media.src} playsInline crossOrigin="anonymous">
              <track kind="subtitles" label="English" src={media.captions} srcLang="en" />
            </Video>
          </VideoSkin>
        </VideoPlayer>
      );
    } else {
      const { MinimalVideoSkin } = await import('../../react/src/presets/video/minimal-skin');

      renderReact(
        <VideoPlayer poster={media.poster}>
          <MinimalVideoSkin className="preview-player">
            <Video src={media.src} playsInline crossOrigin="anonymous">
              <track kind="subtitles" label="English" src={media.captions} srcLang="en" />
            </Video>
          </MinimalVideoSkin>
        </VideoPlayer>
      );
    }

    return;
  }

  await import('../../html/src/define/video/player');
  const tag = skin === 'default-video' ? 'video-skin' : 'video-minimal-skin';

  if (skin === 'default-video') await import('../../html/src/define/video/skin');
  else await import('../../html/src/define/video/minimal-skin');

  root.innerHTML = `<video-player poster="${media.poster}"><${tag} class="preview-player"><video src="${media.src}" playsinline crossorigin="anonymous"><track kind="subtitles" label="English" src="${media.captions}" srclang="en"></video></${tag}></video-player>`;
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
  links.remove();
});
