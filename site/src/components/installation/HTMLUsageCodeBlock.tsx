import { useStore } from '@nanostores/react';
import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { VJS10_DEMO_VIDEO } from '@/consts';
import type { Renderer, Skin, UseCase } from '@/stores/installation';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';

function getRendererTag(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    'background-video': 'background-video',
    // cloudflare: 'cloudflare-video',
    // dash: 'dash-video',
    hls: 'hls-video',
    'html5-audio': 'audio',
    'html5-video': 'video',
    // jwplayer: 'jwplayer-video',
    // 'mux-audio': 'mux-audio',
    // 'mux-background-video': 'mux-background-video',
    // 'mux-video': 'mux-video',
    // shaka: 'shaka-video',
    // spotify: 'spotify-audio',
    // vimeo: 'vimeo-video',
    // wistia: 'wistia-video',
    // youtube: 'youtube-video',
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

function getSkinTag(useCase: UseCase, skin: Skin): string {
  // Background video has fixed skin
  if (useCase === 'background-video') {
    return 'background-video-skin';
  }
  const map: Record<Skin, string> = {
    video: 'video-skin',
    audio: 'audio-skin',
    'minimal-video': 'video-minimal-skin',
    'minimal-audio': 'audio-minimal-skin',
  };
  return map[skin];
}

function isVideoLikeRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'hls' || renderer === 'background-video';
}

function getRendererElement(renderer: Renderer, url: string): string {
  const tag = getRendererTag(renderer);
  const src = url.trim() || getDefaultSourceUrl(renderer);
  const playsInline = isVideoLikeRenderer(renderer) ? ' playsinline' : '';
  return `<${tag} src="${src}"${playsInline}></${tag}>`;
}

function getDefaultSourceUrl(renderer: Renderer): string {
  switch (renderer) {
    case 'hls':
      return VJS10_DEMO_VIDEO.hls;
    case 'background-video':
    case 'html5-audio':
    case 'html5-video':
    default:
      return VJS10_DEMO_VIDEO.mp4;
  }
}

function generateHTMLCode(useCase: UseCase, skin: Skin, renderer: Renderer, url: string): string {
  const providerTag = getProviderTag(useCase);
  const skinTag = getSkinTag(useCase, skin);
  const rendererElement = getRendererElement(renderer, url);

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

function getSkinImportParts(skin: Skin): { group: string; skinFile: string } {
  if (skin === 'minimal-video') return { group: 'video', skinFile: 'minimal-skin' };
  if (skin === 'minimal-audio') return { group: 'audio', skinFile: 'minimal-skin' };
  return { group: skin, skinFile: 'skin' };
}

function getMediaImportSubpath(renderer: Renderer): string | null {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hls-video',
    // 'mux-audio': 'mux-audio',
    // 'mux-background-video': 'mux-background-video',
    // 'mux-video': 'mux-video',
  };
  return map[renderer] ?? null;
}

function generateJS(useCase: UseCase, skin: Skin, renderer: Renderer): string {
  if (useCase === 'background-video') {
    const mediaSubpath = getMediaImportSubpath(renderer);
    const mediaImport = mediaSubpath ? `\nimport '@videojs/html/media/${mediaSubpath}';` : '';
    return `import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';${mediaImport}`;
  }
  const { group, skinFile } = getSkinImportParts(skin);
  const mediaSubpath = getMediaImportSubpath(renderer);
  const mediaImport = mediaSubpath ? `\nimport '@videojs/html/media/${mediaSubpath}';` : '';
  return `import '@videojs/html/${group}/player';
import '@videojs/html/${group}/${skinFile}';${mediaImport}`;
}

export default function HTMLUsageCodeBlock() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $installMethod = useStore(installMethod);
  const $sourceUrl = useStore(sourceUrl);

  return (
    <>
      {$installMethod !== 'cdn' && (
        <TabsRoot maxWidth={false}>
          <TabsList label="HTML implementation">
            <Tab value="javascript" initial>
              JavaScript
            </Tab>
          </TabsList>
          <TabsPanel value="javascript" initial>
            <ClientCode code={generateJS($useCase, $skin, $renderer)} lang="javascript" />
          </TabsPanel>
        </TabsRoot>
      )}
      <TabsRoot maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial>
          <ClientCode code={generateHTMLCode($useCase, $skin, $renderer, $sourceUrl)} lang="html" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
