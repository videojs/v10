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

function getPresetAccess(useCase: UseCase): string {
  if (useCase === 'default-video') {
    return 'presets.website';
  }
  return `presets['${useCase}']`;
}

function getProviderComponent(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'VideoProvider',
    'default-audio': 'AudioProvider',
    'background-video': 'BackgroundVideoProvider',
  };
  return map[useCase];
}

function generateReactCode(useCase: UseCase, skin: Skin, renderer: Renderer, playbackId: string | null): string {
  const providerComponent = getProviderComponent(useCase);
  const rendererComponent = getRendererComponent(renderer);
  const presetAccess = getPresetAccess(useCase);

  // Background video has fixed skin and subpath imports, others use skin picker value
  const isBackgroundVideo = useCase === 'background-video';
  const skinComponent = isBackgroundVideo ? 'BackgroundVideoSkin' : getSkinComponent(skin);
  const { group, skinFile } = getSkinImportParts(skin);
  const skinCssImport = isBackgroundVideo
    ? '@videojs/react/background/skin.css'
    : `@videojs/react/${group}/${skinFile}.css`;
  const componentImportPath = isBackgroundVideo ? '@videojs/react/background' : '@videojs/react';

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

  return `import '${skinCssImport}';
import { ${providerComponent}, ${skinComponent}, ${rendererComponent} } from '${componentImportPath}';

${propsInterface}

export const MyPlayer = ({ ${destructuredProp} }: MyPlayerProps) => {
  return (
    {/* The Provider passes state between the UI components
        and the Media, and makes fully custom UIs possible.
        Does not render its own HTML element. */}
    <${providerComponent}>
      {/* Skins contain the entire player UI and are easily swappable.
          They can each be "ejected" for full control and customization
          of UI components. */}
      <${skinComponent}>
        {/* Media are players without UIs, handling networking
            and display of the media.
            They are easily swappable to handle different sources. */}
        ${rendererJsx}
      </${skinComponent}>
    </${providerComponent}>
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
