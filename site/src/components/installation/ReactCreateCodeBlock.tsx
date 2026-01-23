import type { Renderer, Skin, UseCase } from '@/stores/installation';

import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { muxPlaybackId, renderer, skin, useCase } from '@/stores/installation';

function getRendererComponent(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    cloudflare: 'CloudflareVideo',
    dash: 'DashVideo',
    hls: 'HlsVideo',
    'html5-audio': 'Audio',
    'html5-video': 'Video',
    jwplayer: 'JwplayerVideo',
    mux: 'MuxVideo',
    shaka: 'ShakaVideo',
    spotify: 'SpotifyAudio',
    vimeo: 'VimeoVideo',
    wistia: 'WistiaVideo',
    youtube: 'YoutubeVideo',
  };
  return map[renderer];
}

function getSkinComponent(skin: Skin): string {
  const map: Record<Skin, string> = {
    frosted: 'FrostedVideoSkin',
    minimal: 'MinimalVideoSkin',
  };
  return map[skin];
}

function getPresetAccess(useCase: UseCase): string {
  if (useCase === 'website') {
    return 'presets.website';
  }
  return `presets['${useCase}']`;
}

function generateReactCode(useCase: UseCase, skin: Skin, renderer: Renderer, playbackId: string | null): string {
  const skinComponent = getSkinComponent(skin);
  const rendererComponent = getRendererComponent(renderer);
  const presetAccess = getPresetAccess(useCase);

  // Determine props based on renderer + playbackId
  const isMuxWithPlaybackId = renderer === 'mux' && playbackId;
  const propsInterface = isMuxWithPlaybackId
    ? 'interface MyPlayerProps {\n  playbackId: string;\n}'
    : 'interface MyPlayerProps {\n  src: string;\n}';
  const destructuredProp = isMuxWithPlaybackId ? 'playbackId' : 'src';
  const rendererJsx = isMuxWithPlaybackId
    ? `<${rendererComponent} playbackId="${playbackId}" />`
    : `<${rendererComponent} src={src} />`;

  return `// [your project] ./components/player/index.tsx
import { createPlayer, presets, ${rendererComponent} } from '@videojs/react';
import { ${skinComponent} } from '@videojs/react/presets/${useCase}';
import '@videojs/react/presets/${useCase}/skins/${skin}.css';

${propsInterface}

// Set up the player state features
const { PlayerProvider } = createPlayer(${presetAccess});

export const MyPlayer = ({ ${destructuredProp} }: MyPlayerProps) => {
  return (
    {/* The Provider passes state between the UI components
        and the Media, and makes fully custom UIs possible.
        Does not render its own HTML element. */}
    <PlayerProvider>
      {/* Skins contain the entire player UI and are easily swappable.
          They can each be "ejected" for full control and customization
          of UI components. */}
      <${skinComponent}>
        {/* Media are players without UIs, handling networking
            and display of the media.
            They are easily swappable to handle different sources. */}
        ${rendererJsx}
      </${skinComponent}>
    </PlayerProvider>
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
          React
        </Tab>
      </TabsList>
      <TabsPanel value="react" initial>
        <ClientCode code={generateReactCode($useCase, $skin, $renderer, $muxPlaybackId)} lang="tsx" />
      </TabsPanel>
    </TabsRoot>
  );
}
