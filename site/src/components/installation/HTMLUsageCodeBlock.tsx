import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Renderer, Skin, UseCase } from '@/stores/installation';
import { muxPlaybackId, renderer, skin, useCase } from '@/stores/installation';

function getRendererTag(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    cloudflare: 'cloudflare-video',
    dash: 'dash-video',
    hls: 'hls-video',
    'html5-audio': 'audio',
    'html5-video': 'video',
    jwplayer: 'jwplayer-video',
    mux: 'mux-video',
    shaka: 'shaka-video',
    spotify: 'spotify-audio',
    vimeo: 'vimeo-video',
    wistia: 'wistia-video',
    youtube: 'youtube-video',
  };
  return map[renderer];
}

function getProviderTag(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'video-player',
    'default-audio': 'audio-player',
    'background-video': 'background-video-player',
  };
  return map[useCase];
}

function getSkinTag(skin: Skin): string {
  const map: Record<Skin, string> = {
    'default-video': 'video-skin',
    'default-audio': 'audio-skin',
    minimal: 'minimal-video-skin',
  };
  return map[skin];
}

function getRendererElement(renderer: Renderer, playbackId: string | null): string {
  const tag = getRendererTag(renderer);

  // When renderer is 'mux' and we have a playback ID, use playback-id attribute
  if (renderer === 'mux' && playbackId) {
    return `<${tag} playback-id="${playbackId}"></${tag}>`;
  }

  // Default: use src attribute placeholder
  return `<${tag} src="..."></${tag}>`;
}

function generateHTMLCode(useCase: UseCase, skin: Skin, renderer: Renderer, playbackId: string | null): string {
  const providerTag = getProviderTag(useCase);
  const skinTag = getSkinTag(skin);
  const rendererElement = getRendererElement(renderer, playbackId);

  return `<!--
  The PlayerProvider passes state between the UI components
  and Media, and makes fully custom UIs possible.
  It does not have layout by default (display:contents)
 -->
<${providerTag}>
  <!--
    Skins contain the entire player UI and are easily swappable.
    They can each be "ejected" for full control and customization
    of UI components.
   -->
  <${skinTag}>
    <!--
      Media are players without UIs, handling networking
      and display of the media. They are easily swappable
      to handle different sources.
    -->
    ${rendererElement}
  </${skinTag}>
</${providerTag}>`;
}

function getSkinImportPath(skin: Skin): string {
  const map: Record<Skin, string> = {
    'default-video': '@videojs/html/video/skin',
    'default-audio': '@videojs/html/audio/skin',
    minimal: '@videojs/html/video/minimal-skin',
  };
  return map[skin];
}

function generateJS(skin: Skin): string {
  return `import '${getSkinImportPath(skin)}';`;
}

export default function HTMLUsageCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $muxPlaybackId = useStore(muxPlaybackId);

  return (
    <>
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="javascript" initial>
            JavaScript
          </Tab>
        </TabsList>
        <TabsPanel value="javascript" initial>
          <ClientCode code={generateJS($skin)} lang="javascript" />
        </TabsPanel>
      </TabsRoot>
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={generateHTMLCode($useCase, $skin, $renderer, $muxPlaybackId)} lang="html" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
