import { generateCdnCode } from './cdn-code';
import { INSTALLATION_DEMO_SOURCES } from './defaults';
import {
  getInstallationPreset,
  getMediaSubpath,
  type InstallMethod,
  isMuxRenderer,
  MUX_DATA_EXTENSION_SUBPATH,
  MUX_DATA_PACKAGE,
  type Renderer,
  type Skin,
  type UseCase,
} from './types';

export interface InstallationOptions {
  framework: 'html' | 'react';
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
    return INSTALLATION_DEMO_SOURCES.live;
  }

  const map: Record<Renderer, string> = {
    'html5-video': INSTALLATION_DEMO_SOURCES.videoMp4,
    'html5-audio': INSTALLATION_DEMO_SOURCES.audio,
    hls: INSTALLATION_DEMO_SOURCES.videoHls,
    'background-video': INSTALLATION_DEMO_SOURCES.videoMp4,
    dash: INSTALLATION_DEMO_SOURCES.dash,
    // Mux media take a stream.mux.com source; the demo HLS URL is already one.
    'mux-video': INSTALLATION_DEMO_SOURCES.videoHls,
    'mux-audio': INSTALLATION_DEMO_SOURCES.videoHls,
    vimeo: INSTALLATION_DEMO_SOURCES.vimeo,
    youtube: INSTALLATION_DEMO_SOURCES.youtube,
    cloudflare: INSTALLATION_DEMO_SOURCES.cloudflare,
    spotify: INSTALLATION_DEMO_SOURCES.spotify,
    tiktok: INSTALLATION_DEMO_SOURCES.tiktok,
    twitch: INSTALLATION_DEMO_SOURCES.twitch,
  };

  return map[renderer];
}

export function resolveInstallationSourceUrl(sourceUrl: string, renderer: Renderer, useCase: UseCase): string {
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

function escapeHTMLAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Skin module basename within a preset group: `skin` or `minimal-skin`. */
function getSkinFile(skin: Exclude<Skin, 'none'>): 'skin' | 'minimal-skin' {
  return skin === 'minimal-video' || skin === 'minimal-audio' ? 'minimal-skin' : 'skin';
}

/**
 * The optional peer that ships a renderer's adapter, or `null` for the renderers `@videojs/html` and `@videojs/react`
 * play on their own. Every renderer is listed so a new one cannot be added without deciding what it installs.
 */
export function getAdapterPackage(renderer: Renderer): string | null {
  const packages: Record<Renderer, string | null> = {
    'background-video': null,
    cloudflare: '@videojs/cloudflare-video',
    dash: '@videojs/dash-video',
    hls: '@videojs/hlsjs-video',
    'html5-audio': null,
    'html5-video': null,
    'mux-audio': '@videojs/mux-audio',
    'mux-video': '@videojs/mux-video',
    spotify: '@videojs/spotify-audio',
    tiktok: '@videojs/tiktok-video',
    twitch: '@videojs/twitch-video',
    vimeo: '@videojs/vimeo-video',
    youtube: '@videojs/youtube-video',
  };

  return packages[renderer];
}

/** Packages a source install still needs after the registry item installs the core React or HTML package. */
export function generateSourceMediaInstallCode(
  renderer: Renderer
): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string> | null {
  const packages: string[] = [];
  const adapter = getAdapterPackage(renderer);

  if (adapter !== null) packages.push(adapter);

  if (isMuxRenderer(renderer)) packages.push(MUX_DATA_PACKAGE);

  if (packages.length === 0) return null;

  const value = packages.join(' ');

  return {
    npm: `npm install ${value}`,
    pnpm: `pnpm add ${value}`,
    yarn: `yarn add ${value}`,
    bun: `bun add ${value}`,
  };
}

function installPackages(framework: '@videojs/html' | '@videojs/react', renderer: Renderer): string {
  const adapter = getAdapterPackage(renderer);
  const packages: string[] = [framework];

  if (adapter !== null) packages.push(adapter);

  // Mux media pair with the separate Mux Data extension by default, so the
  // install command pulls in its package as well.
  if (isMuxRenderer(renderer)) packages.push(MUX_DATA_PACKAGE);

  return packages.join(' ');
}

// ---------------------------------------------------------------------------
// HTML Install
// ---------------------------------------------------------------------------

export function generateHTMLInstallCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
  cdnMediaSubpaths: readonly string[],
  cdnBase?: string
): Record<'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  const packages = installPackages('@videojs/html', opts.renderer);

  return {
    cdn: generateCdnCode(opts.useCase, opts.skin, opts.renderer, cdnMediaSubpaths, cdnBase),
    npm: `npm install ${packages}`,
    pnpm: `pnpm add ${packages}`,
    yarn: `yarn add ${packages}`,
    bun: `bun add ${packages}`,
  };
}

// ---------------------------------------------------------------------------
// React Install
// ---------------------------------------------------------------------------

export function generateReactInstallCode(
  opts: Pick<InstallationOptions, 'renderer'> = { renderer: 'html5-video' }
): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string> {
  const packages = installPackages('@videojs/react', opts.renderer);

  return {
    npm: `npm install ${packages}`,
    pnpm: `pnpm add ${packages}`,
    yarn: `yarn add ${packages}`,
    bun: `bun add ${packages}`,
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

// The media element line, plus the Mux Data extension for Mux media. Mux Data is
// a separate, opt-in extension included here by default for Mux-hosted playback —
// no environment key required — placed as a sibling of the media element.
function generateMediaMarkup(
  tag: string,
  src: string,
  playsInline: string,
  renderer: Renderer,
  indent: string
): string {
  const mediaEl = `${indent}<${tag} src="${escapeHTMLAttribute(src)}"${playsInline}></${tag}>`;

  if (!isMuxRenderer(renderer)) return mediaEl;

  return `${mediaEl}
${indent}<!--
${indent}    Mux Data monitors playback quality. It is a separate,
${indent}    opt-in component, included by default for Mux-hosted playback.
${indent}  -->
${indent}<mux-data></mux-data>`;
}

function generateHTMLMarkup(useCase: UseCase, skin: Skin, renderer: Renderer, url: string): string {
  const playerTag = getPlayerTag(useCase);
  const tag = getRendererTag(renderer);
  const src = resolveInstallationSourceUrl(url, renderer, useCase);
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
${generateMediaMarkup(tag, src, playsInline, renderer, '  ')}
</${playerTag}>`;
  }

  const skinTag = getSkinTag(useCase, skin as Exclude<Skin, 'none'>);

  return `${playerComment}
<${playerTag}>
  <!--
    Skins contain the entire player UI and are easily swappable.
    Add the skin source to your project for full control over its
    UI components.
   -->
  <${skinTag}>
${skinMediaComment}
${generateMediaMarkup(tag, src, playsInline, renderer, '    ')}
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

  // Mux media pair with the separate Mux Data extension by default; register it
  // alongside the Mux media import.
  const muxDataImport = isMuxRenderer(renderer)
    ? `\nimport '@videojs/html/extensions/${MUX_DATA_EXTENSION_SUBPATH}';`
    : '';

  if (skin === 'none') {
    return `import '@videojs/html/${group}/player';${mediaImport}${muxDataImport}`;
  }

  return `import '@videojs/html/${group}/player';
import '@videojs/html/${group}/${getSkinFile(skin)}';${mediaImport}${muxDataImport}`;
}

export function generateHTMLUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
): HTMLUsageCode {
  const html = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, opts.sourceUrl);
  const imports =
    opts.installMethod !== 'cdn' ? generateHTMLImports(opts.useCase, opts.skin, opts.renderer) : undefined;

  return { html, ...(imports ? { imports } : {}) };
}

// ---------------------------------------------------------------------------
// Vue and Svelte
// ---------------------------------------------------------------------------

const FRAMEWORK_SOURCE_PLACEHOLDER = '__VIDEOJS_FRAMEWORK_SOURCE__';

function indentBlock(value: string, indent: string): string {
  return value
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function getHTMLCustomElementTags(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  includePackagedSkin = true
): string[] {
  const tags = [getPlayerTag(useCase)];

  if (includePackagedSkin && (skin !== 'none' || useCase === 'background-video')) {
    tags.push(getSkinTag(useCase, skin === 'none' ? 'video' : skin));
  }

  const mediaTag = getRendererTag(renderer);

  if (mediaTag.includes('-')) tags.push(mediaTag);

  if (isMuxRenderer(renderer)) tags.push('mux-data');

  return [...new Set(tags)];
}

function defaultSkinForUseCase(useCase: UseCase): Skin {
  return getInstallationPreset(useCase).mediaType;
}

export interface VueCustomElementConfigCode {
  'vite.config.ts': string;
  'nuxt.config.ts': string;
}

export interface VueCreateCode {
  'VideoPlayer.vue': string;
}

export interface VueUsageCode {
  'App.vue': string;
}

export interface SvelteCreateCode {
  'VideoPlayer.svelte': string;
}

export interface SvelteUsageCode {
  '+page.svelte': string;
  'App.svelte': string;
}

export function generateVueCustomElementConfigCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
  includeSourceSkinElements = false
): VueCustomElementConfigCode {
  const tags = getHTMLCustomElementTags(opts.useCase, opts.skin, opts.renderer, !includeSourceSkinElements)
    .map((tag) => `'${tag}'`)
    .join(', ');
  const elementSet = `const videoJsElements = new Set([${tags}]);`;
  const isCustomElement = includeSourceSkinElements
    ? `(tag) => tag.startsWith('media-') || videoJsElements.has(tag)`
    : `(tag) => videoJsElements.has(tag)`;

  return {
    'vite.config.ts': `import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

${elementSet}

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: ${isCustomElement},
        },
      },
    }),
  ],
});`,
    'nuxt.config.ts': `${elementSet}

export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: ${isCustomElement},
    },
  },
});`,
  };
}

export function generateVueCreateCode(opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>): VueCreateCode {
  const imports = generateHTMLImports(opts.useCase, opts.skin, opts.renderer);
  const markup = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, FRAMEWORK_SOURCE_PLACEHOLDER).replace(
    `src="${FRAMEWORK_SOURCE_PLACEHOLDER}"`,
    ':src="src"'
  );

  return {
    'VideoPlayer.vue': `<script setup lang="ts">
${imports}

defineProps<{ src: string }>();
</script>

<template>
${indentBlock(markup, '  ')}
</template>`,
  };
}

export function generateVueUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): VueUsageCode {
  const source = resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);

  return {
    'App.vue': `<script setup lang="ts">
import VideoPlayer from './components/VideoPlayer.vue';
</script>

<template>
  <h1>Welcome to My App</h1>
  <VideoPlayer src="${escapeHTMLAttribute(source)}" />
</template>`,
  };
}

export function generateSvelteCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): SvelteCreateCode {
  const imports = indentBlock(generateHTMLImports(opts.useCase, opts.skin, opts.renderer), '  ');
  const markup = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, FRAMEWORK_SOURCE_PLACEHOLDER).replace(
    `src="${FRAMEWORK_SOURCE_PLACEHOLDER}"`,
    'src={src}'
  );

  return {
    'VideoPlayer.svelte': `<script lang="ts">
${imports}

  let { src }: { src: string } = $props();
</script>

${markup}`,
  };
}

export function generateSvelteUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): SvelteUsageCode {
  const source = resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);
  const component = (path: string) => `<script lang="ts">
  import VideoPlayer from '${path}';
</script>

<h1>Welcome to My App</h1>
<VideoPlayer src="${escapeHTMLAttribute(source)}" />`;

  return {
    '+page.svelte': component('$lib/VideoPlayer.svelte'),
    'App.svelte': component('./lib/VideoPlayer.svelte'),
  };
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

// The media JSX, plus the Mux Data extension for Mux media. Mux Data is a
// separate, opt-in extension rendered here by default for Mux-hosted playback —
// no environment key required — as a sibling of the media component.
function generateReactMediaJsx(rendererJsx: string, renderer: Renderer, indent: string): string {
  if (!isMuxRenderer(renderer)) return rendererJsx;

  return `${rendererJsx}
${indent}{/* Mux Data monitors playback quality. It is a separate, opt-in
${indent}    component, rendered by default for Mux-hosted playback. */}
${indent}<MuxData />`;
}

export function generateReactCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl'>
): Record<'app/page.tsx', string> {
  const { useCase, skin, renderer } = opts;
  const rendererComponent = getRendererComponent(renderer);
  const playerComponent = getPresetPlayer(useCase);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, renderer, useCase);

  const isBackgroundVideo = useCase === 'background-video';
  const isNoSkin = skin === 'none';
  const group = getInstallationPreset(useCase).group;

  const rendererProps = isVideoLikeRenderer(renderer)
    ? `src=${JSON.stringify(source)} playsInline`
    : `src=${JSON.stringify(source)}`;
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

  // Mux media pair with the separate Mux Data extension by default; render it
  // alongside the Mux media and import it beside the media import.
  const muxDataImport = isMuxRenderer(renderer)
    ? `import { MuxData } from '@videojs/react/extensions/${MUX_DATA_EXTENSION_SUBPATH}';`
    : null;

  const playerJsx = skinComponent
    ? `    <${playerComponent}>
      <${skinComponent}>
        ${generateReactMediaJsx(rendererJsx, renderer, '        ')}
      </${skinComponent}>
    </${playerComponent}>`
    : `    <${playerComponent}>
      ${generateReactMediaJsx(rendererJsx, renderer, '      ')}
    </${playerComponent}>`;

  const imports = [
    ...(skinCssImport ? [`import '${skinCssImport}';`] : []),
    presetImport,
    ...(mediaImport ? [mediaImport] : []),
    ...(muxDataImport ? [muxDataImport] : []),
  ].join('\n');

  return {
    'app/page.tsx': `${imports}

export default function Page() {
  return (
${playerJsx}
  );
}`,
  };
}

/** Build a React player around a skin component copied into the app by Shadcn. */
export function generateSourceReactCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl'>
): Record<'app/page.tsx', string> {
  const { useCase, renderer } = opts;
  const preset = getInstallationPreset(useCase);
  const playerComponent = getPresetPlayer(useCase);
  const rendererComponent = getRendererComponent(renderer);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, renderer, useCase);
  // A registry theme changes the source behind the stable item name. Both the Default and Minimal catalogs export the
  // same local component (`VideoSkin`, `AudioSkin`, and so on).
  const skinComponent = `${preset.componentPrefix}Skin`;
  const rendererProps = isVideoLikeRenderer(renderer)
    ? `src=${JSON.stringify(source)} playsInline`
    : `src=${JSON.stringify(source)}`;
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;
  const presetImports = [playerComponent];
  let mediaImport: string | null = null;

  if (isPresetRenderer(renderer)) {
    presetImports.push(rendererComponent);
  } else {
    mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
  }

  const imports = [
    `import { ${presetImports.join(', ')} } from '@videojs/react/${preset.group}';`,
    ...(mediaImport ? [mediaImport] : []),
    ...(isMuxRenderer(renderer)
      ? [`import { MuxData } from '@videojs/react/extensions/${MUX_DATA_EXTENSION_SUBPATH}';`]
      : []),
    `import { ${skinComponent} } from '@/components/videojs/${preset.flag}/skin';`,
  ].join('\n');

  return {
    'app/page.tsx': `${imports}

export default function Page() {
  return (
    <${playerComponent}>
      <${skinComponent}>
        ${generateReactMediaJsx(rendererJsx, renderer, '        ')}
      </${skinComponent}>
    </${playerComponent}>
  );
}`,
  };
}

export interface SourceHTMLUsageCode {
  imports: string;
  media: string;
  player: string;
  skinFile: string;
}

export interface SourceVueUsageCode extends VueCustomElementConfigCode {
  'VideoPlayer.vue': string;
  'App.vue': string;
  media: string;
  skinFile: string;
}

export interface SourceSvelteUsageCode extends SvelteUsageCode {
  'VideoPlayer.svelte': string;
  media: string;
  skinFile: string;
}

/** Build the imports and two small edits needed to use an HTML skin copied into the app by Shadcn. */
export function generateSourceHTMLUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): SourceHTMLUsageCode {
  const { useCase, renderer } = opts;
  const preset = getInstallationPreset(useCase);
  const mediaSubpath = getMediaSubpath(renderer);
  const tag = getRendererTag(renderer);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, renderer, useCase);
  const playsInline = isVideoLikeRenderer(renderer) ? ' playsinline' : '';
  const imports = [
    `import '@videojs/html/${preset.group}/player';`,
    ...(mediaSubpath ? [`import '@videojs/html/media/${mediaSubpath}';`] : []),
    ...(isMuxRenderer(renderer) ? [`import '@videojs/html/extensions/${MUX_DATA_EXTENSION_SUBPATH}';`] : []),
    `import '@/components/videojs/${preset.flag}/skin';`,
  ].join('\n');

  return {
    imports,
    media: generateMediaMarkup(tag, source, playsInline, renderer, ''),
    player: `<${getPlayerTag(useCase)}>
  <!-- Paste the contents of components/videojs/${preset.flag}/skin.html here. -->
</${getPlayerTag(useCase)}>

<script type="module" src="/src/player.ts"></script>`,
    skinFile: `components/videojs/${preset.flag}/skin.html`,
  };
}

/** Build Vue files around an HTML skin copied into the app by Shadcn. */
export function generateSourceVueUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): SourceVueUsageCode {
  const source = generateSourceHTMLUsageCode(opts);
  const playerTag = getPlayerTag(opts.useCase);
  const config = generateVueCustomElementConfigCode({ ...opts, skin: defaultSkinForUseCase(opts.useCase) }, true);

  return {
    ...config,
    media: source.media,
    skinFile: source.skinFile,
    'VideoPlayer.vue': `<script setup lang="ts">
${source.imports}
</script>

<template>
  <${playerTag}>
    <!-- Paste the complete updated ${source.skinFile} contents here. -->
  </${playerTag}>
</template>`,
    'App.vue': `<script setup lang="ts">
import VideoPlayer from './components/VideoPlayer.vue';
</script>

<template>
  <VideoPlayer />
</template>`,
  };
}

/** Build Svelte files around an HTML skin copied into the app by Shadcn. */
export function generateSourceSvelteUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
): SourceSvelteUsageCode {
  const source = generateSourceHTMLUsageCode(opts);
  const playerTag = getPlayerTag(opts.useCase);
  const component = `<script lang="ts">
${indentBlock(source.imports, '  ')}
</script>

<${playerTag}>
  <!-- Paste the complete updated ${source.skinFile} contents here. -->
</${playerTag}>`;
  const usage = (path: string) => `<script lang="ts">
  import VideoPlayer from '${path}';
</script>

<VideoPlayer />`;

  return {
    media: source.media,
    skinFile: source.skinFile,
    'VideoPlayer.svelte': component,
    '+page.svelte': usage('$lib/VideoPlayer.svelte'),
    'App.svelte': usage('./lib/VideoPlayer.svelte'),
  };
}
