import { Video, VideoPlayer } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

import './styles.css';

const modules = {
  'react/default-video/vanilla': () => import('virtual:vjsc/skin/react/default-video/vanilla.tsx'),
  'react/default-video/tailwind': () => import('virtual:vjsc/skin/react/default-video/tailwind.tsx'),
  'react/minimal-video/vanilla': () => import('virtual:vjsc/skin/react/minimal-video/vanilla.tsx'),
  'react/minimal-video/tailwind': () => import('virtual:vjsc/skin/react/minimal-video/tailwind.tsx'),
  'html/default-video/vanilla': () => import('virtual:vjsc/skin/html/default-video/vanilla.tsx'),
  'html/default-video/tailwind': () => import('virtual:vjsc/skin/html/default-video/tailwind.tsx'),
  'html/minimal-video/vanilla': () => import('virtual:vjsc/skin/html/minimal-video/vanilla.tsx'),
  'html/minimal-video/tailwind': () => import('virtual:vjsc/skin/html/minimal-video/tailwind.tsx'),
} as const;

type ModuleKey = keyof typeof modules;

const params = new URLSearchParams(location.search);
const requested = `${params.get('framework') ?? 'react'}/${params.get('skin') ?? 'default-video'}/${params.get('style') ?? 'vanilla'}`;
const key: ModuleKey = requested in modules ? (requested as ModuleKey) : 'react/default-video/vanilla';
const [framework, , styleMode] = key.split('/') as ['react' | 'html', string, 'vanilla' | 'tailwind'];
const loaded = await modules[key]();

if (styleMode === 'tailwind') await import('../vjsc/styles/tailwind.css');

function App({ Skin }: { Skin: React.ComponentType<React.PropsWithChildren<{ className?: string }>> }) {
  return (
    <VideoPlayer>
      <Skin className="preview-player">
        <Video
          src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
          playsInline
          crossOrigin="anonymous"
        />
      </Skin>
    </VideoPlayer>
  );
}

const root = document.getElementById('root')!;
const links = document.createElement('nav');
links.ariaLabel = 'Skin preview variants';
links.innerHTML = Object.keys(modules)
  .map((value) => {
    const [nextFramework, nextSkin, nextStyle] = value.split('/');
    const href = `?framework=${nextFramework}&skin=${nextSkin}&style=${nextStyle}`;
    return `<a href="${href}"${value === key ? ' aria-current="page"' : ''}>${value}</a>`;
  })
  .join('');
root.before(links);

if (framework === 'react') {
  const Skin =
    'DefaultVideoSkin' in loaded
      ? loaded.DefaultVideoSkin
      : 'MinimalVideoSkin' in loaded
        ? loaded.MinimalVideoSkin
        : null;
  if (!Skin) throw new Error(`React Skin module \`${key}\` did not export a Skin component.`);
  createRoot(root).render(<App Skin={Skin as React.ComponentType<React.PropsWithChildren<{ className?: string }>>} />);
} else {
  const Skin =
    'DefaultVideoSkin' in loaded
      ? loaded.DefaultVideoSkin
      : 'MinimalVideoSkin' in loaded
        ? loaded.MinimalVideoSkin
        : null;
  if (!Skin) throw new Error(`HTML Skin module \`${key}\` did not export a Skin component.`);
  await import('../../html/src/define/video/player');
  const render = Skin as (props?: { className?: string }) => { toString(): string };
  const skin = String(render({})).replace(
    '<slot></slot>',
    '<video src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8" playsinline crossorigin="anonymous"></video>'
  );
  root.innerHTML = `<video-player>${skin}</video-player>`;
}
