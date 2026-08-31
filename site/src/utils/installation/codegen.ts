import {
  VJS10_DEMO_CLOUDFLARE,
  VJS10_DEMO_DASH,
  VJS10_DEMO_LIVE,
  VJS10_DEMO_SPOTIFY,
  VJS10_DEMO_TIKTOK,
  VJS10_DEMO_TWITCH,
  VJS10_DEMO_VIDEO,
  VJS10_DEMO_VIMEO,
  VJS10_DEMO_YOUTUBE,
} from '@/consts';
import type { SupportedFramework } from '@/types/docs';
import { generateCdnCode } from '@/utils/installation/cdn-code';
import {
  getInstallationPreset,
  getMediaSubpath,
  type InstallMethod,
  type Renderer,
  type Skin,
  type UseCase,
} from '@/utils/installation/types';

export interface InstallationOptions {
  /**
   * The framework the reader picked. Frameworks without an adapter package — Vue and Svelte — install `@videojs/html`
   * and reuse the HTML generators below through their own single-file component shells.
   *
   * `@videojs/cli` bundles this module and mirrors its signatures in `packages/cli/src/site-modules.d.ts`, where the
   * field stays narrowed to the frameworks the CLI's `--framework` flag accepts.
   */
  framework: SupportedFramework;
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  sourceUrl: string;
  installMethod: InstallMethod;
}

export interface HTMLUsageCode {
  html: string;
  imports?: string;
}

type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateInstallationOptions(opts: InstallationOptions): ValidationResult {
  const preset = getInstallationPreset(opts.useCase);

  if (!preset.renderers.includes(opts.renderer)) {
    return {
      valid: false,
      reason: `Invalid media type "${opts.renderer}" for the "${preset.flag}" preset. Valid options: ${preset.renderers.join(', ')}`,
    };
  }

  if (opts.framework === 'react' && opts.installMethod === 'cdn') {
    return { valid: false, reason: 'CDN installation is not supported for React. Use npm, pnpm, yarn, or bun.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getDefaultSourceUrl(renderer: Renderer, useCase: UseCase): string {
  if (getInstallationPreset(useCase).live) {
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
    youtube: VJS10_DEMO_YOUTUBE,
    cloudflare: VJS10_DEMO_CLOUDFLARE,
    spotify: VJS10_DEMO_SPOTIFY,
    tiktok: VJS10_DEMO_TIKTOK,
    twitch: VJS10_DEMO_TWITCH,
  };

  return map[renderer];
}

function resolveSourceUrl(sourceUrl: string, renderer: Renderer, useCase: UseCase): string {
  return sourceUrl.trim() || getDefaultSourceUrl(renderer, useCase);
}

// Whether the rendered media element takes the `playsinline` attribute. The
// embed providers render an <iframe> and play inline on their own, and the
// audio renderers render audio, so none of them get it.
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
): Record<'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  return {
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
    youtube: 'youtube-video',
    cloudflare: 'cloudflare-video',
    spotify: 'spotify-audio',
    tiktok: 'tiktok-video',
    twitch: 'twitch-video',
  };

  return map[renderer];
}

function getPlayerTag(useCase: UseCase): string {
  return `${getInstallationPreset(useCase).tagPrefix}-player`;
}

function getSkinTag(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
  const prefix = getInstallationPreset(useCase).tagPrefix;

  if (useCase === 'background-video') return `${prefix}-skin`;

  return getSkinFile(skin) === 'minimal-skin' ? `${prefix}-minimal-skin` : `${prefix}-skin`;
}

function generateHTMLMarkup(useCase: UseCase, skin: Skin, renderer: Renderer, url: string): string {
  const playerTag = getPlayerTag(useCase);
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

  const playerComment = `<!--
  The player element owns and shares state between the UI
  components and Media. Put layout on the skin or container.
 -->`;

  if (skin === 'none' && useCase !== 'background-video') {
    return `${playerComment}
<${playerTag}>
${mediaComment}
  <${tag} src="${src}"${playsInline}></${tag}>
</${playerTag}>`;
  }

  const skinTag = getSkinTag(useCase, skin as Exclude<Skin, 'none'>);

  return `${playerComment}
<${playerTag}>
  <!--
    Skins contain the entire player UI and are easily swappable.
    They can each be "ejected" for full control and customization
    of UI components.
   -->
  <${skinTag}>
${skinMediaComment}
    <${tag} src="${src}"${playsInline}></${tag}>
  </${skinTag}>
</${playerTag}>`;
}

function generateHTMLImports(useCase: UseCase, skin: Skin, renderer: Renderer): string {
  if (useCase === 'background-video') {
    const mediaSubpath = getMediaSubpath(renderer);
    const mediaImport = mediaSubpath ? `\nimport '@videojs/html/media/${mediaSubpath}';` : '';

    return `import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';${mediaImport}`;
  }

  const group = getInstallationPreset(useCase).group;
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
): HTMLUsageCode {
  const html = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, opts.sourceUrl);
  const imports =
    opts.installMethod !== 'cdn' ? generateHTMLImports(opts.useCase, opts.skin, opts.renderer) : undefined;

  return { html, imports };
}

// ---------------------------------------------------------------------------
// Vue and Svelte Usage
// ---------------------------------------------------------------------------

/**
 * Vue and Svelte have no adapter package: they install `@videojs/html` and write the same custom elements in their own
 * components. Both generators below reuse `generateHTMLUsageCode` for the player configuration and then transform that
 * markup — binding its source attribute to a prop and reading its tag list — so the configuration has one source.
 */
export interface VueUsageCode {
  /** `MyPlayer.vue`: the element imports, a `src` prop, and the generated markup with `src` bound. */
  component: string;
  /** `App.vue`: the component rendered with the source the reader picked. */
  usage: string;
  /** `vite.config.ts`: `isCustomElement` for exactly the tags this player renders. */
  viteConfig: string;
}

export interface SvelteUsageCode {
  /** `MyPlayer.svelte`: the element imports, a `src` prop, and the generated markup with `src` bound. */
  component: string;
  /** `App.svelte`: the component rendered with the source the reader picked. */
  usage: string;
}

function indent(code: string, spaces: number): string {
  const padding = ' '.repeat(spaces);

  return code
    .split('\n')
    .map((line) => (line.trim() ? `${padding}${line}` : line))
    .join('\n');
}

/**
 * Custom-element tags in the generated markup, in document order.
 *
 * Only hyphenated tags qualify, so a preset built on plain `<video>` or `<audio>` contributes nothing — which is what
 * Vue's `isCustomElement` needs, since it must not claim built-in elements.
 */
function getCustomElementTags(html: string): string[] {
  const tags = new Set<string>();

  for (const [, tag] of html.matchAll(/<([a-z][a-z\d]*-[a-z\d-]*)/g)) {
    tags.add(tag);
  }

  return [...tags];
}

/**
 * Swap the media element's literal `src` for a framework binding.
 *
 * Every media the picker offers takes its source through a single `src` attribute, so the one replacement covers all of
 * them. Other attributes the markup carries — `playsinline`, for instance — are static configuration and stay literal.
 */
function bindSourceAttribute(html: string, source: string, binding: string): string {
  return html.replace(`src="${source}"`, binding);
}

export function generateVueUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
): VueUsageCode {
  const { html, imports } = generateHTMLUsageCode(opts);
  const source = resolveSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);

  // A CDN install registers the elements from the app's HTML shell, so only a bundled install imports them.
  const importLines = imports ? `${imports}\n\n` : '';
  const template = indent(bindSourceAttribute(html, source, ':src="src"'), 2);

  const component = `<script setup lang="ts">
${importLines}defineProps<{ src: string }>();
</script>

<template>
${template}
</template>`;

  const usage = `<script setup lang="ts">
import MyPlayer from './components/MyPlayer.vue';
</script>

<template>
  <MyPlayer src="${source}" />
</template>`;

  const tagList = getCustomElementTags(html)
    .map((tag) => `'${tag}'`)
    .join(', ');

  const viteConfig = `import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const videoJsElements = new Set([${tagList}]);

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => videoJsElements.has(tag),
        },
      },
    }),
  ],
});`;

  return { component, usage, viteConfig };
}

export function generateSvelteUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
): SvelteUsageCode {
  const { html, imports } = generateHTMLUsageCode(opts);
  const source = resolveSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);

  const importLines = imports ? `${indent(imports, 2)}\n\n` : '';
  const markup = bindSourceAttribute(html, source, '{src}');

  const component = `<script lang="ts">
${importLines}  let { src }: { src: string } = $props();
</script>

${markup}`;

  const usage = `<script lang="ts">
  import MyPlayer from './lib/MyPlayer.svelte';
</script>

<MyPlayer src="${source}" />`;

  return { component, usage };
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
    youtube: 'YouTubeVideo',
    cloudflare: 'CloudflareVideo',
    spotify: 'SpotifyAudio',
    tiktok: 'TikTokVideo',
    twitch: 'TwitchVideo',
  };

  return map[renderer];
}

function getSkinComponent(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
  const name = `${getInstallationPreset(useCase).componentPrefix}Skin`;

  return getSkinFile(skin) === 'minimal-skin' ? `Minimal${name}` : name;
}

function getPresetPlayer(useCase: UseCase): string {
  return `${getInstallationPreset(useCase).componentPrefix}Player`;
}

function isPresetRenderer(renderer: Renderer): boolean {
  return renderer === 'html5-video' || renderer === 'html5-audio' || renderer === 'background-video';
}

export function generateReactCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): Record<'MyPlayer.tsx', string> {
  const { useCase, skin, renderer } = opts;
  const rendererComponent = getRendererComponent(renderer);
  const playerComponent = getPresetPlayer(useCase);

  const isBackgroundVideo = useCase === 'background-video';
  const isNoSkin = skin === 'none';
  const group = getInstallationPreset(useCase).group;

  const rendererProps = isVideoLikeRenderer(renderer) ? 'src={src} playsInline' : 'src={src}';
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;

  let presetImport: string;
  let mediaImport: string | null = null;
  let skinCssImport: string | null = null;
  let skinComponent: string | null = null;

  if (isBackgroundVideo) {
    skinComponent = getSkinComponent(useCase, 'video');
    skinCssImport = `@videojs/react/${group}/skin.css`;
    presetImport = `import { ${playerComponent}, ${skinComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
  } else if (isNoSkin) {
    if (isPresetRenderer(renderer)) {
      presetImport = `import { ${playerComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
    } else {
      presetImport = `import { ${playerComponent} } from '@videojs/react/${group}';`;
      mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
    }
  } else {
    skinComponent = getSkinComponent(useCase, skin);
    skinCssImport = `@videojs/react/${group}/${getSkinFile(skin)}.css`;

    if (isPresetRenderer(renderer)) {
      presetImport = `import { ${playerComponent}, ${skinComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
    } else {
      presetImport = `import { ${playerComponent}, ${skinComponent} } from '@videojs/react/${group}';`;
      mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
    }
  }

  const playerJsx = skinComponent
    ? `    <${playerComponent}>
      <${skinComponent}>
        ${rendererJsx}
      </${skinComponent}>
    </${playerComponent}>`
    : `    <${playerComponent}>
      ${rendererJsx}
    </${playerComponent}>`;

  const imports = [
    ...(skinCssImport ? [`import '${skinCssImport}';`] : []),
    presetImport,
    ...(mediaImport ? [mediaImport] : []),
  ].join('\n');

  return {
    'MyPlayer.tsx': `${imports}

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
