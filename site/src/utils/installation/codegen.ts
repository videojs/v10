import { VJS10_DEMO_VIDEO } from '@/consts';
import { generateCdnCode } from '@/utils/installation/cdn-code';
import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';
import { VALID_RENDERERS } from '@/utils/installation/types';

export interface InstallationOptions {
  framework: 'html' | 'react';
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  sourceUrl: string;
  installMethod: InstallMethod;
}

type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateInstallationOptions(opts: InstallationOptions): ValidationResult {
  if (opts.framework === 'react' && opts.installMethod === 'cdn') {
    return { valid: false, reason: 'CDN installation is not supported for React. Use npm, pnpm, yarn, or bun.' };
  }

  const validRenderers = VALID_RENDERERS[opts.useCase];
  if (!validRenderers.includes(opts.renderer)) {
    return {
      valid: false,
      reason: `Media type "${opts.renderer}" is not valid for the "${opts.useCase}" preset. Valid options: ${validRenderers.join(', ')}`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getDefaultSourceUrl(renderer: Renderer): string {
  return renderer === 'hls' ? VJS10_DEMO_VIDEO.hls : VJS10_DEMO_VIDEO.mp4;
}

function resolveSourceUrl(sourceUrl: string, renderer: Renderer): string {
  return sourceUrl.trim() || getDefaultSourceUrl(renderer);
}

function isVideoLikeRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'hls' || renderer === 'background-video';
}

function getSkinImportParts(skin: Skin): { group: string; skinFile: string } {
  if (skin === 'minimal-video') return { group: 'video', skinFile: 'minimal-skin' };
  if (skin === 'minimal-audio') return { group: 'audio', skinFile: 'minimal-skin' };
  return { group: skin, skinFile: 'skin' };
}

function getMediaImportSubpath(renderer: Renderer): string | null {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hls-video',
  };
  return map[renderer] ?? null;
}

// ---------------------------------------------------------------------------
// HTML Install
// ---------------------------------------------------------------------------

export function generateHTMLInstallCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): Record<'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  return {
    cdn: generateCdnCode(opts.useCase, opts.skin, opts.renderer),
    npm: 'npm install @videojs/html',
    pnpm: 'pnpm add @videojs/html',
    yarn: 'yarn add @videojs/html',
    bun: 'bun add @videojs/html',
  };
}

// ---------------------------------------------------------------------------
// React Install
// ---------------------------------------------------------------------------

export function generateReactInstallCode(): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  return {
    npm: 'npm install @videojs/react',
    pnpm: 'pnpm add @videojs/react',
    yarn: 'yarn add @videojs/react',
    bun: 'bun add @videojs/react',
  };
}

// ---------------------------------------------------------------------------
// HTML Usage
// ---------------------------------------------------------------------------

function getRendererTag(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    'background-video': 'background-video',
    hls: 'hls-video',
    'html5-audio': 'audio',
    'html5-video': 'video',
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

function generateHTMLMarkup(useCase: UseCase, skin: Skin, renderer: Renderer, url: string): string {
  const providerTag = getProviderTag(useCase);
  const skinTag = getSkinTag(useCase, skin);
  const tag = getRendererTag(renderer);
  const src = resolveSourceUrl(url, renderer);
  const playsInline = isVideoLikeRenderer(renderer) ? ' playsinline' : '';

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
    <${tag} src="${src}"${playsInline}></${tag}>
  </${skinTag}>
</${providerTag}>`;
}

function generateHTMLJSImports(useCase: UseCase, skin: Skin, renderer: Renderer): string {
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

export function generateHTMLUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
): { html: string; js?: string } {
  const html = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, opts.sourceUrl);
  const js = opts.installMethod !== 'cdn' ? generateHTMLJSImports(opts.useCase, opts.skin, opts.renderer) : undefined;
  return { html, js };
}

// ---------------------------------------------------------------------------
// React Create
// ---------------------------------------------------------------------------

function getRendererComponent(renderer: Renderer): string {
  const map: Record<Renderer, string> = {
    'background-video': 'BackgroundVideo',
    hls: 'HlsVideo',
    'html5-audio': 'Audio',
    'html5-video': 'Video',
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

function getUseCaseFeatures(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'videoFeatures',
    'default-audio': 'audioFeatures',
    'background-video': 'backgroundFeatures',
  };
  return map[useCase];
}

function isPresetRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'html5-audio' || renderer === 'background-video';
}

function getRendererMediaSubpath(renderer: Renderer): string {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hls-video',
  };
  return map[renderer] ?? renderer;
}

export function generateReactCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): Record<'MyPlayer.tsx', string> {
  const { useCase, skin, renderer } = opts;
  const rendererComponent = getRendererComponent(renderer);
  const featureType = getUseCaseFeatures(useCase);

  const isBackgroundVideo = useCase === 'background-video';
  const skinComponent = isBackgroundVideo ? 'BackgroundVideoSkin' : getSkinComponent(skin);
  const { group, skinFile } = getSkinImportParts(skin);
  const skinCssImport = isBackgroundVideo
    ? '@videojs/react/background/skin.css'
    : `@videojs/react/${group}/${skinFile}.css`;

  const presetSubpath = isBackgroundVideo ? 'background' : group;

  let presetImport: string;
  let mediaImport: string | null = null;

  if (isPresetRenderer(renderer)) {
    presetImport = `import { ${skinComponent}, ${rendererComponent} } from '@videojs/react/${presetSubpath}';`;
  } else {
    presetImport = `import { ${skinComponent} } from '@videojs/react/${presetSubpath}';`;
    mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getRendererMediaSubpath(renderer)}';`;
  }

  const rendererProps = isVideoLikeRenderer(renderer) ? 'src={src} playsInline' : 'src={src}';
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;

  const imports = [
    `import '${skinCssImport}';`,
    `import { createPlayer, ${featureType} } from '@videojs/react';`,
    presetImport,
    ...(mediaImport ? [mediaImport] : []),
  ].join('\n');

  return {
    'MyPlayer.tsx': `'use client';

${imports}

const Player = createPlayer({ features: ${featureType} });

interface MyPlayerProps {
  src: string;
}

export const MyPlayer = ({ src }: MyPlayerProps) => {
  return (
    <Player.Provider>
      <${skinComponent}>
        ${rendererJsx}
      </${skinComponent}>
    </Player.Provider>
  );
};`,
  };
}

// ---------------------------------------------------------------------------
// React Usage
// ---------------------------------------------------------------------------

export function generateReactUsageCode(
  opts: Pick<InstallationOptions, 'renderer' | 'sourceUrl'>
): Record<'App.tsx', string> {
  const source = resolveSourceUrl(opts.sourceUrl, opts.renderer);

  return {
    'App.tsx': `import { MyPlayer } from '../components/player';

export const HomePage = () => {
  return (
    <div>
      <h1>Welcome to My App</h1>
      <MyPlayer src="${source}" />
    </div>
  );
};`,
  };
}
