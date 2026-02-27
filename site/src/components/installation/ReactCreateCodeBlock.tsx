import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Renderer, Skin, UseCase } from '@/stores/installation';
import { muxPlaybackId, renderer, skin, useCase } from '@/stores/installation';

function getRendererComponent(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    'background-video': 'BackgroundVideo',
    cloudflare: 'CloudflareVideo',
    dash: 'DashVideo',
    hls: 'HlsVideo',
    'html5-audio': 'Audio',
    'html5-video': 'Video',
    jwplayer: 'JwplayerVideo',
    'mux-audio': 'MuxAudio',
    'mux-background-video': 'MuxBackgroundVideo',
    'mux-video': 'MuxVideo',
    // shaka: 'ShakaVideo', this one probably adds more confusion than help at this level
    spotify: 'SpotifyAudio',
    vimeo: 'VimeoVideo',
    wistia: 'WistiaVideo',
    youtube: 'YoutubeVideo',
  };
  return map[renderer];
}

function getSkinComponent(skin: Skin): string {
  const map: Record<Skin, string> = {
    video: 'VideoSkin',
    audio: 'AudioSkin',
    'minimal-video': 'MinimalVideoSkin',
    'minimal-audio': 'MinimalAudioSkin',
  };
  return map[skin];
}

function getSkinImportParts(skin: Skin): { group: string; skinFile: string } {
  if (skin === 'minimal-video') return { group: 'video', skinFile: 'minimal-skin' };
  if (skin === 'minimal-audio') return { group: 'audio', skinFile: 'minimal-skin' };
  return { group: skin, skinFile: 'skin' };
}

function getUseCaseFeatures(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'video',
    'default-audio': 'audio',
    'background-video': 'background',
  };
  return map[useCase];
}

function isPresetRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'html5-audio' || renderer === 'background-video';
}

function getRendererMediaSubpath(renderer: Renderer): string {
  const map: Partial<Record<Renderer, string>> = {
    cloudflare: 'cloudflare-video',
    dash: 'dash-video',
    hls: 'hls-video',
    jwplayer: 'jwplayer-video',
    'mux-audio': 'mux-audio',
    'mux-background-video': 'mux-background-video',
    'mux-video': 'mux-video',
    spotify: 'spotify-audio',
    vimeo: 'vimeo-video',
    wistia: 'wistia-video',
    youtube: 'youtube-video',
  };
  return map[renderer] ?? renderer;
}

function generateReactCode(useCase: UseCase, skin: Skin, renderer: Renderer, playbackId: string | null): string {
  const rendererComponent = getRendererComponent(renderer);
  const featureType = getUseCaseFeatures(useCase);

  // Background video has fixed skin and subpath imports, others use skin picker value
  const isBackgroundVideo = useCase === 'background-video';
  const skinComponent = isBackgroundVideo ? 'BackgroundVideoSkin' : getSkinComponent(skin);
  const { group, skinFile } = getSkinImportParts(skin);
  const skinCssImport = isBackgroundVideo
    ? '@videojs/react/background/skin.css'
    : `@videojs/react/${group}/${skinFile}.css`;

  // Preset subpath where skin + default media components live
  const presetSubpath = isBackgroundVideo ? 'background' : group;

  // Skin and media imports — preset renderers share a subpath with the skin
  let presetImport: string;
  let mediaImport: string | null = null;

  if (isPresetRenderer(renderer)) {
    presetImport = `import { ${skinComponent}, ${rendererComponent} } from '@videojs/react/${presetSubpath}';`;
  } else {
    presetImport = `import { ${skinComponent} } from '@videojs/react/${presetSubpath}';`;
    mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getRendererMediaSubpath(renderer)}';`;
  }

  // Determine props based on renderer + playbackId
  const isMuxWithPlaybackId =
    (renderer === 'mux-video' || renderer === 'mux-audio' || renderer === 'mux-background-video') && playbackId;
  const propsInterface = isMuxWithPlaybackId
    ? 'interface MyPlayerProps {\n  playbackId: string;\n}'
    : 'interface MyPlayerProps {\n  src: string;\n}';
  const destructuredProp = isMuxWithPlaybackId ? 'playbackId' : 'src';
  const rendererJsx = isMuxWithPlaybackId
    ? `<${rendererComponent} playbackId={playbackId} />`
    : `<${rendererComponent} src={src} />`;

  const imports = [
    `import '${skinCssImport}';`,
    `import { createPlayer, features } from '@videojs/react';`,
    presetImport,
    ...(mediaImport ? [mediaImport] : []),
  ].join('\n');

  return `${imports}

const Player = createPlayer({ features: features.${featureType} });

${propsInterface}

export const MyPlayer = ({ ${destructuredProp} }: MyPlayerProps) => {
  return (
    <Player.Provider>
      <${skinComponent}>
        ${rendererJsx}
      </${skinComponent}>
    </Player.Provider>
  );
};`;
}

export default function ReactCreateCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $muxPlaybackId = useStore(muxPlaybackId);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="react" initial>
          ./components/player/index.tsx
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateReactCode($useCase, $skin, $renderer, $muxPlaybackId)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
