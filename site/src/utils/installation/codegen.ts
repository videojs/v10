import { VJS10_DEMO_DASH, VJS10_DEMO_LIVE, VJS10_DEMO_VIDEO, VJS10_DEMO_VIMEO } from '@/consts';
import { generateCdnCode } from '@/utils/installation/cdn-code';
import {
  getMediaSubpath,
  getPresetGroup,
  type InstallMethod,
  isAudioUseCase,
  type Renderer,
  type Skin,
  type UseCase,
} from '@/utils/installation/types';

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

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getDefaultSourceUrl(renderer: Renderer, useCase: UseCase): string {
  // Live presets need a live source or the generated player never reaches the
  // live edge. Only the HLS-family renderers have a live sample to point at —
  // DASH and the progressive renderers fall through to their on-demand samples
  // below, since we don't host a live .mpd and a file can't be live at all.
  const playsLiveSample = renderer === 'hls' || renderer === 'mux-video' || renderer === 'mux-audio';
  if (isLiveUseCase(useCase) && playsLiveSample) {
    return VJS10_DEMO_LIVE.hls;
  }

  const map: Record<Renderer, string> = {
    'html5-video': VJS10_DEMO_VIDEO.mp4,
    // Pre-existing quirk: the audio default points at a video .mp4. Fixing it
    // needs a real audio asset we don't have — tracked as a follow-up.
    'html5-audio': VJS10_DEMO_VIDEO.mp4,
    hls: VJS10_DEMO_VIDEO.hls,
    'background-video': VJS10_DEMO_VIDEO.mp4,
    dash: VJS10_DEMO_DASH,
    // Mux media take a stream.mux.com source; the demo HLS URL is already one.
    'mux-video': VJS10_DEMO_VIDEO.hls,
    'mux-audio': VJS10_DEMO_VIDEO.hls,
    vimeo: VJS10_DEMO_VIMEO,
  };
  return map[renderer];
}

function resolveSourceUrl(sourceUrl: string, renderer: Renderer, useCase: UseCase): string {
  return sourceUrl.trim() || getDefaultSourceUrl(renderer, useCase);
}

function isLiveUseCase(useCase: UseCase): boolean {
  return useCase === 'live-video' || useCase === 'live-audio';
}

// Whether the rendered media element takes the `playsinline` attribute. Vimeo
// renders an <iframe> and mux-audio renders audio, so neither gets it.
function isVideoLikeRenderer(renderer: Renderer): boolean {
  return (
    renderer === 'html5-video' ||
    renderer === 'hls' ||
    renderer === 'background-video' ||
    renderer === 'dash' ||
    renderer === 'mux-video'
  );
}

/** Skin module basename within a preset group: `skin` or `minimal-skin`. */
function getSkinFile(skin: Exclude<Skin, 'none'>): 'skin' | 'minimal-skin' {
  return skin === 'minimal-video' || skin === 'minimal-audio' ? 'minimal-skin' : 'skin';
}

// ---------------------------------------------------------------------------
// HTML Install
// ---------------------------------------------------------------------------

export function generateHTMLInstallCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
  cdnMediaSubpaths: readonly string[]
): { cdn: string | null } & Record<'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  return {
    // null when this preset/skin combination ships no CDN bundle — callers must
    // fall back to a package manager.
    cdn: generateCdnCode(opts.useCase, opts.skin, opts.renderer, cdnMediaSubpaths),
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
    dash: 'dash-video',
    hls: 'hlsjs-video',
    'html5-audio': 'audio',
    'html5-video': 'video',
    'mux-audio': 'mux-audio',
    'mux-video': 'mux-video',
    vimeo: 'vimeo-video',
  };
  return map[renderer];
}

// Tag prefix for a use case. Matches the preset subpath group except for
// background video, whose elements are `background-video-*` while its subpath is
// `background`.
function getTagPrefix(useCase: UseCase): string {
  return useCase === 'background-video' ? 'background-video' : getPresetGroup(useCase);
}

function getProviderTag(useCase: UseCase): string {
  return `${getTagPrefix(useCase)}-player`;
}

function getSkinTag(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
  const prefix = getTagPrefix(useCase);
  if (useCase === 'background-video') return `${prefix}-skin`;
  return getSkinFile(skin) === 'minimal-skin' ? `${prefix}-minimal-skin` : `${prefix}-skin`;
}

function generateHTMLMarkup(useCase: UseCase, skin: Skin, renderer: Renderer, url: string): string {
  const providerTag = getProviderTag(useCase);
  const tag = getRendererTag(renderer);
  const src = resolveSourceUrl(url, renderer, useCase);
  const playsInline = isVideoLikeRenderer(renderer) ? ' playsinline' : '';

  const mediaComment = `  <!--
      Media are players without UIs, handling networking
      and display of the media. They are easily swappable
      to handle different sources.
    -->`;

  const skinMediaComment = `    <!--
        Media are players without UIs, handling networking
        and display of the media. They are easily swappable
        to handle different sources.
      -->`;

  const providerComment = `<!--
  The PlayerProvider passes state between the UI components
  and Media, and makes fully custom UIs possible.
  It does not have layout by default (display:contents)
 -->`;

  if (skin === 'none' && useCase !== 'background-video') {
    return `${providerComment}
<${providerTag}>
${mediaComment}
  <${tag} src="${src}"${playsInline}></${tag}>
</${providerTag}>`;
  }

  const skinTag = getSkinTag(useCase, skin as Exclude<Skin, 'none'>);
  return `${providerComment}
<${providerTag}>
  <!--
    Skins contain the entire player UI and are easily swappable.
    They can each be "ejected" for full control and customization
    of UI components.
   -->
  <${skinTag}>
${skinMediaComment}
    <${tag} src="${src}"${playsInline}></${tag}>
  </${skinTag}>
</${providerTag}>`;
}

function generateHTMLJSImports(useCase: UseCase, skin: Skin, renderer: Renderer): string {
  if (useCase === 'background-video') {
    const mediaSubpath = getMediaSubpath(renderer);
    const mediaImport = mediaSubpath ? `\nimport '@videojs/html/media/${mediaSubpath}';` : '';
    return `import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';${mediaImport}`;
  }
  const group = getPresetGroup(useCase);
  const mediaSubpath = getMediaSubpath(renderer);
  const mediaImport = mediaSubpath ? `\nimport '@videojs/html/media/${mediaSubpath}';` : '';
  if (skin === 'none') {
    return `import '@videojs/html/${group}/player';${mediaImport}`;
  }
  return `import '@videojs/html/${group}/player';
import '@videojs/html/${group}/${getSkinFile(skin)}';${mediaImport}`;
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
    dash: 'DashVideo',
    hls: 'HlsJsVideo',
    'html5-audio': 'Audio',
    'html5-video': 'Video',
    'mux-audio': 'MuxAudio',
    'mux-video': 'MuxVideo',
    vimeo: 'VimeoVideo',
  };
  return map[renderer];
}

function getSkinComponent(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
  if (useCase === 'background-video') return 'BackgroundVideoSkin';
  const base = isAudioUseCase(useCase) ? 'Audio' : 'Video';
  // The live skins are exported as `LiveVideoSkin` / `MinimalLiveVideoSkin` —
  // `Minimal` leads, `Live` sits inside the noun.
  const name = isLiveUseCase(useCase) ? `Live${base}Skin` : `${base}Skin`;
  return getSkinFile(skin) === 'minimal-skin' ? `Minimal${name}` : name;
}

function getUseCaseFeatures(useCase: UseCase): string {
  const map: Record<UseCase, string> = {
    'default-video': 'videoFeatures',
    'live-video': 'liveVideoFeatures',
    'default-audio': 'audioFeatures',
    'live-audio': 'liveAudioFeatures',
    'background-video': 'backgroundFeatures',
  };
  return map[useCase];
}

function isPresetRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'html5-audio' || renderer === 'background-video';
}

export function generateReactCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): Record<'MyPlayer.tsx', string> {
  const { useCase, skin, renderer } = opts;
  const rendererComponent = getRendererComponent(renderer);
  const featureType = getUseCaseFeatures(useCase);

  const isBackgroundVideo = useCase === 'background-video';
  const isNoSkin = skin === 'none';
  const group = getPresetGroup(useCase);

  const rendererProps = isVideoLikeRenderer(renderer) ? 'src={src} playsInline' : 'src={src}';
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;

  let presetImport: string;
  let mediaImport: string | null = null;
  let skinCssImport: string | null = null;
  let skinComponent: string | null = null;

  if (isBackgroundVideo) {
    skinComponent = getSkinComponent(useCase, 'video');
    skinCssImport = `@videojs/react/${group}/skin.css`;
    presetImport = `import { ${skinComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
  } else if (isNoSkin) {
    if (isPresetRenderer(renderer)) {
      presetImport = `import { ${rendererComponent} } from '@videojs/react/${group}';`;
    } else {
      presetImport = '';
      mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
    }
  } else {
    skinComponent = getSkinComponent(useCase, skin);
    skinCssImport = `@videojs/react/${group}/${getSkinFile(skin)}.css`;
    if (isPresetRenderer(renderer)) {
      presetImport = `import { ${skinComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
    } else {
      presetImport = `import { ${skinComponent} } from '@videojs/react/${group}';`;
      mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
    }
  }

  const playerJsx = skinComponent
    ? `    <Player.Provider>
      <${skinComponent}>
        ${rendererJsx}
      </${skinComponent}>
    </Player.Provider>`
    : `    <Player.Provider>
      ${rendererJsx}
    </Player.Provider>`;

  const imports = [
    ...(skinCssImport ? [`import '${skinCssImport}';`] : []),
    `import { createPlayer, ${featureType} } from '@videojs/react';`,
    ...(presetImport ? [presetImport] : []),
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
${playerJsx}
  );
};`,
  };
}

// ---------------------------------------------------------------------------
// React Usage
// ---------------------------------------------------------------------------

export function generateReactUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): Record<'App.tsx', string> {
  const source = resolveSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);

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
