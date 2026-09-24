import { generateCdnCode } from './cdn-code';
import { INSTALLATION_DEMO_SOURCES } from './defaults';
import { getInstallationPlayerComponentName, getInstallationPreset, type Skin, type UseCase } from './presets';
import {
  getAdapterPackage,
  getInstallationRenderer,
  getMediaSubpath,
  isMuxRenderer,
  isPresetRenderer,
  isVideoLikeRenderer,
  MUX_DATA_EXTENSION_SUBPATH,
  MUX_DATA_PACKAGE,
  type Renderer,
} from './renderers';
import type { InstallMethod } from './selection';
import type { RegistryStyling } from './shadcn';

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

export interface PackageManagerInstallCommands {
  npm: string;
  pnpm: string;
  yarn: string;
  bun: string;
}

export interface HTMLInstallCode extends PackageManagerInstallCommands {
  cdn: string;
}

export interface ReactCreateCode {
  'app/page.tsx': string;
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

  return getInstallationRenderer(renderer).defaultSource;
}

export function resolveInstallationSourceUrl(sourceUrl: string, renderer: Renderer, useCase: UseCase): string {
  return sourceUrl.trim() || getDefaultSourceUrl(renderer, useCase);
}

function escapeHTMLAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Skin module basename within a preset group: `skin` or `minimal-skin`. */
function getSkinFile(skin: Exclude<Skin, 'none'>): 'skin' | 'minimal-skin' {
  return skin === 'minimal-video' || skin === 'minimal-audio' ? 'minimal-skin' : 'skin';
}

/** Packages a source install still needs after the registry item installs the core React or HTML package. */
export function generateSourceMediaInstallCode(
  renderer: Renderer,
  packageVersion?: string
): PackageManagerInstallCommands | null {
  const packages: string[] = [];
  const adapter = getAdapterPackage(renderer);

  if (adapter !== null) packages.push(adapter);

  if (isMuxRenderer(renderer)) packages.push(MUX_DATA_PACKAGE);

  if (packages.length === 0) return null;

  const value = versionPackages(packages, packageVersion);

  return packageManagerInstallCommands(value);
}

function versionPackages(packages: readonly string[], packageVersion?: string): string {
  return packages.map((packageName) => (packageVersion ? `${packageName}@${packageVersion}` : packageName)).join(' ');
}

function packageManagerInstallCommands(packages: string): PackageManagerInstallCommands {
  return {
    npm: `npm install ${packages}`,
    pnpm: `pnpm add ${packages}`,
    yarn: `yarn add ${packages}`,
    bun: `bun add ${packages}`,
  };
}

function installPackages(
  framework: '@videojs/html' | '@videojs/react',
  renderer: Renderer,
  packageVersion?: string
): string {
  const adapter = getAdapterPackage(renderer);
  const packages: string[] = [framework];

  if (adapter !== null) packages.push(adapter);

  // Mux media pair with the separate Mux Data extension by default, so the
  // install command pulls in its package as well.
  if (isMuxRenderer(renderer)) packages.push(MUX_DATA_PACKAGE);

  return versionPackages(packages, packageVersion);
}

// ---------------------------------------------------------------------------
// HTML Install
// ---------------------------------------------------------------------------

export function generateHTMLInstallCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
  cdnMediaSubpaths: readonly string[],
  cdnBase?: string,
  packageVersion?: string
): HTMLInstallCode {
  const packages = installPackages('@videojs/html', opts.renderer, packageVersion);

  return {
    cdn: generateCdnCode(opts.useCase, opts.skin, opts.renderer, cdnMediaSubpaths, cdnBase),
    ...packageManagerInstallCommands(packages),
  };
}

// ---------------------------------------------------------------------------
// React Install
// ---------------------------------------------------------------------------

export function generateReactInstallCode(
  opts: Pick<InstallationOptions, 'renderer'> = { renderer: 'html5-video' },
  packageVersion?: string
): PackageManagerInstallCommands {
  const packages = installPackages('@videojs/react', opts.renderer, packageVersion);

  return packageManagerInstallCommands(packages);
}

// ---------------------------------------------------------------------------
// HTML Usage
// ---------------------------------------------------------------------------

export function getRendererTag(renderer: Renderer): string {
  return getInstallationRenderer(renderer).htmlTag;
}

function getPlayerTag(useCase: UseCase): string {
  return `${getInstallationPreset(useCase).tagPrefix}-player`;
}

function isSizedVideoPlayer(useCase: UseCase): boolean {
  return getInstallationPreset(useCase).mediaType === 'video';
}

const htmlVideoLayout = ' style="display: block; width: 100%; aspect-ratio: 16 / 9;"';
const reactVideoLayout = ` style={{ width: '100%', aspectRatio: '16 / 9' }}`;
const reactTailwindVideoLayout = ' className="aspect-video w-full"';
const htmlContainerVideoLayout = ' style="position: relative; display: block; width: 100%; aspect-ratio: 16 / 9;"';
const reactContainerVideoLayout = ` style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}`;

export function getSkinTag(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
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
  return generateMediaMarkupWithSource(tag, `src="${escapeHTMLAttribute(src)}"`, playsInline, renderer, indent);
}

function generateMediaMarkupWithSource(
  tag: string,
  sourceAttribute: string,
  playsInline: string,
  renderer: Renderer,
  indent: string
): string {
  const mediaEl = `${indent}<${tag} ${sourceAttribute}${playsInline}></${tag}>`;

  if (!isMuxRenderer(renderer)) return mediaEl;

  return `${mediaEl}
${indent}<!--
${indent}    Mux Data monitors playback quality. It is a separate,
${indent}    opt-in component, included by default for Mux-hosted playback.
${indent}  -->
${indent}<mux-data></mux-data>`;
}

function generateHTMLMarkup(
  useCase: UseCase,
  skin: Skin,
  renderer: Renderer,
  url: string,
  mediaSlot?: string,
  layout: 'inline' | 'stylesheet' = 'inline'
): string {
  const playerTag = getPlayerTag(useCase);
  const tag = getRendererTag(renderer);
  const src = resolveInstallationSourceUrl(url, renderer, useCase);
  const playsInline = isVideoLikeRenderer(renderer) ? ' playsinline' : '';
  const mediaMarkup = (indent: string) =>
    mediaSlot === undefined
      ? generateMediaMarkup(tag, src, playsInline, renderer, indent)
      : indentBlock(mediaSlot, indent);

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
    const containerLayout = isSizedVideoPlayer(useCase) && layout === 'inline' ? htmlContainerVideoLayout : '';

    return `${playerComment}
<${playerTag}>
  <media-container${containerLayout}>
${skinMediaComment}
${mediaMarkup('    ')}
  </media-container>
</${playerTag}>`;
  }

  const skinTag = getSkinTag(useCase, skin === 'none' ? defaultSkinForUseCase(useCase) : skin);
  const skinLayout = isSizedVideoPlayer(useCase) && layout === 'inline' ? htmlVideoLayout : '';

  return `${playerComment}
<${playerTag}>
  <!--
    Skins contain the entire player UI and are easily swappable.
    Add the skin source to your project for full control over its
    UI components.
   -->
  <${skinTag}${skinLayout}>
${skinMediaComment}
${mediaMarkup('    ')}
  </${skinTag}>
</${playerTag}>`;
}

function generateSfcPlayerStyle(useCase: UseCase, skin: Skin): string {
  if (!isSizedVideoPlayer(useCase)) return '';

  const container = skin === 'none' && useCase !== 'background-video';
  const selector = container
    ? 'media-container'
    : getSkinTag(useCase, skin === 'none' ? defaultSkinForUseCase(useCase) : skin);
  const position = container ? '  position: relative;\n' : '';

  return `<style>
${selector} {
${position}  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>`;
}

function generateSourceSkinSfcStyle(useCase: UseCase): string {
  if (!isSizedVideoPlayer(useCase)) return '';

  return `<style>
media-container {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>`;
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
    return `import '@videojs/html/${group}/player';
import '@videojs/html/ui/container';${mediaImport}${muxDataImport}`;
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
  const result: HTMLUsageCode = { html };

  if (imports) result.imports = imports;

  return result;
}

// ---------------------------------------------------------------------------
// Vue and Svelte
// ---------------------------------------------------------------------------

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
  } else if (skin === 'none') {
    tags.push('media-container');
  }

  const mediaTag = getRendererTag(renderer);

  if (mediaTag.includes('-')) tags.push(mediaTag);

  if (isMuxRenderer(renderer)) tags.push('mux-data');

  return [...new Set(tags)];
}

function defaultSkinForUseCase(useCase: UseCase): Exclude<Skin, 'none'> {
  return getInstallationPreset(useCase).mediaType;
}

export interface VueCustomElementConfigCode {
  'astro.config.mjs': string;
  'vite.config.ts': string;
  'nuxt.config.ts': string;
}

export interface VueCreateCode {
  component: string;
}

export interface VueUsageCode {
  'App.vue': string;
  'index.astro': string;
}

function vuePlayerImport(componentName: string, playerImport = `./components/${componentName}.vue`): string {
  return playerImport === '#components'
    ? `import { ${componentName} } from '#components';`
    : `import ${componentName} from '${playerImport}';`;
}

export interface SvelteCreateCode {
  component: string;
}

export interface SvelteUsageCode {
  '+page.svelte': string;
  'App.svelte': string;
  'index.astro': string;
}

function generateAstroComponentUsage(component: string, playerImport: string, media: string): string {
  return `---
import ${component} from '${playerImport}';
---

<${component} client:load>
${indentBlock(media, '  ')}
</${component}>`;
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
    'astro.config.mjs': `import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';

${elementSet}

export default defineConfig({
  integrations: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: ${isCustomElement},
        },
      },
    }),
  ],
});`,
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
  const markup = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, '', '<slot />', 'stylesheet');
  const style = generateSfcPlayerStyle(opts.useCase, opts.skin);

  return {
    component: `<script setup lang="ts">
${imports}
</script>

<template>
${indentBlock(markup, '  ')}
</template>${style ? `\n\n${style}` : ''}`,
  };
}

export function generateVueUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & { playerImport?: string | undefined }
): VueUsageCode {
  const componentName = getInstallationPlayerComponentName(opts.useCase);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);
  const tag = getRendererTag(opts.renderer);
  const playsInline = isVideoLikeRenderer(opts.renderer) ? ' playsinline' : '';
  const media = generateMediaMarkup(tag, source, playsInline, opts.renderer, '');

  return {
    'App.vue': `<script setup lang="ts">
${vuePlayerImport(componentName, opts.playerImport)}
</script>

<template>
  <h1>Welcome to My App</h1>
  <${componentName}>
${indentBlock(media, '    ')}
  </${componentName}>
</template>`,
    'index.astro': generateAstroComponentUsage(
      componentName,
      opts.playerImport ?? `../components/${componentName}.vue`,
      media
    ),
  };
}

export function generateSvelteCreateCode(
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
): SvelteCreateCode {
  const imports = indentBlock(generateHTMLImports(opts.useCase, opts.skin, opts.renderer), '  ');
  const markup = generateHTMLMarkup(opts.useCase, opts.skin, opts.renderer, '', '<slot />', 'stylesheet');
  const style = generateSfcPlayerStyle(opts.useCase, opts.skin);

  return {
    component: `<script lang="ts">
${imports}
</script>

${markup}${style ? `\n\n${style}` : ''}`,
  };
}

export function generateSvelteUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & { playerImport?: string | undefined }
): SvelteUsageCode {
  const componentName = getInstallationPlayerComponentName(opts.useCase);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase);
  const tag = getRendererTag(opts.renderer);
  const playsInline = isVideoLikeRenderer(opts.renderer) ? ' playsinline' : '';
  const media = generateMediaMarkupWithSource(tag, `src={${JSON.stringify(source)}}`, playsInline, opts.renderer, '');
  const component = (path: string) => `<script lang="ts">
  import ${componentName} from '${path}';
</script>

<h1>Welcome to My App</h1>
<${componentName}>
${indentBlock(media, '  ')}
</${componentName}>`;

  return {
    '+page.svelte': component(`$lib/${componentName}.svelte`),
    'App.svelte': component(`./lib/${componentName}.svelte`),
    'index.astro': generateAstroComponentUsage(
      componentName,
      opts.playerImport ?? `../components/${componentName}.svelte`,
      media
    ),
  };
}

// ---------------------------------------------------------------------------
// React Create
// ---------------------------------------------------------------------------

export function getRendererComponent(renderer: Renderer): string {
  return getInstallationRenderer(renderer).reactComponent;
}

export function getSkinComponent(useCase: UseCase, skin: Exclude<Skin, 'none'>): string {
  const name = `${getInstallationPreset(useCase).componentPrefix}Skin`;

  return getSkinFile(skin) === 'minimal-skin' ? `Minimal${name}` : name;
}

function getPresetPlayer(useCase: UseCase): string {
  return getInstallationPlayerComponentName(useCase);
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
): ReactCreateCode {
  const { useCase, skin, renderer } = opts;
  const rendererComponent = getRendererComponent(renderer);
  const playerComponent = getPresetPlayer(useCase);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, renderer, useCase);

  const isBackgroundVideo = useCase === 'background-video';
  const isNoSkin = skin === 'none';
  const group = getInstallationPreset(useCase).group;

  const rendererProps = isVideoLikeRenderer(renderer)
    ? `src={${JSON.stringify(source)}} playsInline`
    : `src={${JSON.stringify(source)}}`;
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;
  const skinLayout = isSizedVideoPlayer(useCase) ? reactVideoLayout : '';
  const containerLayout = isSizedVideoPlayer(useCase) ? reactContainerVideoLayout : '';

  let presetImport: string;
  let mediaImport: string | null = null;
  let skinCssImport: string | null = null;
  let skinComponent: string | null = null;

  if (isBackgroundVideo) {
    skinComponent = getSkinComponent(useCase, 'video');
    skinCssImport = `@videojs/react/${group}/skin.css`;

    if (isPresetRenderer(renderer)) {
      presetImport = `import { ${playerComponent}, ${skinComponent}, ${rendererComponent} } from '@videojs/react/${group}';`;
    } else {
      presetImport = `import { ${playerComponent}, ${skinComponent} } from '@videojs/react/${group}';`;
      mediaImport = `import { ${rendererComponent} } from '@videojs/react/media/${getMediaSubpath(renderer) ?? renderer}';`;
    }
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
      <${skinComponent}${skinLayout}>
        ${generateReactMediaJsx(rendererJsx, renderer, '        ')}
      </${skinComponent}>
    </${playerComponent}>`
    : `    <${playerComponent}>
      <Container${containerLayout}>
        ${generateReactMediaJsx(rendererJsx, renderer, '        ')}
      </Container>
    </${playerComponent}>`;

  const imports = [
    ...(skinCssImport ? [`import '${skinCssImport}';`] : []),
    ...(isNoSkin ? [`import { Container } from '@videojs/react';`] : []),
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
  opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl'> & {
    componentsAlias?: string;
    styling?: RegistryStyling;
  }
): ReactCreateCode {
  const { useCase, renderer } = opts;
  const preset = getInstallationPreset(useCase);
  const playerComponent = getPresetPlayer(useCase);
  const rendererComponent = getRendererComponent(renderer);
  const source = resolveInstallationSourceUrl(opts.sourceUrl, renderer, useCase);
  // A registry theme changes the source behind the stable item name. Both the Default and Minimal catalogs export the
  // same local component (`VideoSkin`, `AudioSkin`, and so on).
  const skinComponent = `${preset.componentPrefix}Skin`;
  const rendererProps = isVideoLikeRenderer(renderer)
    ? `src={${JSON.stringify(source)}} playsInline`
    : `src={${JSON.stringify(source)}}`;
  const rendererJsx = `<${rendererComponent} ${rendererProps} />`;
  const skinLayout = isSizedVideoPlayer(useCase)
    ? opts.styling === 'tailwind'
      ? reactTailwindVideoLayout
      : reactVideoLayout
    : '';
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
    `import { ${skinComponent} } from '${opts.componentsAlias ?? '@/components'}/videojs/${preset.flag}/skin';`,
  ].join('\n');

  return {
    'app/page.tsx': `${imports}

export default function Page() {
  return (
    <${playerComponent}>
      <${skinComponent}${skinLayout}>
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
  component: string;
  'App.vue': string;
  'index.astro': string;
  media: string;
  skinStyle: string;
  sourceSkinFile: string;
  skinFile: string;
}

export interface SourceSvelteUsageCode extends SvelteUsageCode {
  component: string;
  media: string;
  skinStyle: string;
  sourceSkinFile: string;
  skinFile: string;
}

function generateSourceHTMLUsageCodeWithImports(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & {
    componentsAlias?: string;
    componentsDirectory?: string;
  },
  includeSkinRegistration = true
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
    ...(includeSkinRegistration
      ? [`import '${opts.componentsAlias ?? '@/components'}/videojs/${preset.flag}/skin';`]
      : []),
  ].join('\n');

  return {
    imports,
    media: generateMediaMarkup(tag, source, playsInline, renderer, ''),
    player: `<${getPlayerTag(useCase)}>
  <!-- Paste the contents of ${opts.componentsDirectory ?? 'components'}/videojs/${preset.flag}/skin.html here. -->
</${getPlayerTag(useCase)}>`,
    skinFile: `${opts.componentsDirectory ?? 'components'}/videojs/${preset.flag}/skin.html`,
  };
}

/** Build the imports and two small edits needed to use an HTML skin copied into the app by Shadcn. */
export function generateSourceHTMLUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & {
    componentsAlias?: string;
    componentsDirectory?: string;
  }
): SourceHTMLUsageCode {
  return generateSourceHTMLUsageCodeWithImports(opts);
}

/** Build Vue files around an HTML skin copied into the app by Shadcn. */
export function generateSourceVueUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & {
    componentsAlias?: string;
    componentsDirectory?: string;
    playerImport?: string | undefined;
  }
): SourceVueUsageCode {
  const componentName = getInstallationPlayerComponentName(opts.useCase);
  const source = generateSourceHTMLUsageCodeWithImports(opts, false);
  const playerTag = getPlayerTag(opts.useCase);
  const config = generateVueCustomElementConfigCode({ ...opts, skin: defaultSkinForUseCase(opts.useCase) }, true);
  const skinSource = `${opts.componentsAlias ?? '@/components'}/videojs/${getInstallationPreset(opts.useCase).flag}/skin`;
  const skinFile = `${opts.componentsDirectory ?? 'components'}/videojs/${getInstallationPreset(opts.useCase).flag}/skin.vue`;
  const media = generateMediaMarkup(
    getRendererTag(opts.renderer),
    resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase),
    isVideoLikeRenderer(opts.renderer) ? ' playsinline' : '',
    opts.renderer,
    ''
  );

  return {
    ...config,
    media,
    skinStyle: generateSourceSkinSfcStyle(opts.useCase),
    sourceSkinFile: source.skinFile,
    skinFile,
    component: `<script setup lang="ts">
${source.imports}
import VideoSkin from '${skinSource}.vue';
</script>

<template>
  <${playerTag}>
    <VideoSkin>
      <slot />
    </VideoSkin>
  </${playerTag}>
</template>`,
    'App.vue': `<script setup lang="ts">
${vuePlayerImport(componentName, opts.playerImport)}
</script>

<template>
  <${componentName}>
${indentBlock(media, '    ')}
  </${componentName}>
</template>`,
    'index.astro': generateAstroComponentUsage(
      componentName,
      opts.playerImport ?? `../components/${componentName}.vue`,
      media
    ),
  };
}

/** Build Svelte files around an HTML skin copied into the app by Shadcn. */
export function generateSourceSvelteUsageCode(
  opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'> & {
    componentsAlias?: string;
    componentsDirectory?: string;
    playerImport?: string | undefined;
  }
): SourceSvelteUsageCode {
  const componentName = getInstallationPlayerComponentName(opts.useCase);
  const source = generateSourceHTMLUsageCodeWithImports(opts, false);
  const playerTag = getPlayerTag(opts.useCase);
  const skinSource = `${opts.componentsAlias ?? '$lib/components'}/videojs/${getInstallationPreset(opts.useCase).flag}/skin`;
  const skinFile = `${opts.componentsDirectory ?? 'components'}/videojs/${getInstallationPreset(opts.useCase).flag}/skin.svelte`;
  const media = generateMediaMarkupWithSource(
    getRendererTag(opts.renderer),
    `src={${JSON.stringify(resolveInstallationSourceUrl(opts.sourceUrl, opts.renderer, opts.useCase))}}`,
    isVideoLikeRenderer(opts.renderer) ? ' playsinline' : '',
    opts.renderer,
    ''
  );
  const component = `<script lang="ts">
${indentBlock(source.imports, '  ')}
  import VideoSkin from '${skinSource}.svelte';
</script>

<${playerTag}>
  <VideoSkin>
    <slot />
  </VideoSkin>
</${playerTag}>`;
  const usage = (path: string) => `<script lang="ts">
  import ${componentName} from '${path}';
</script>

<${componentName}>
${indentBlock(media, '  ')}
</${componentName}>`;

  return {
    media,
    skinStyle: generateSourceSkinSfcStyle(opts.useCase),
    sourceSkinFile: source.skinFile,
    skinFile,
    component,
    '+page.svelte': usage(`$lib/${componentName}.svelte`),
    'App.svelte': usage(`./lib/${componentName}.svelte`),
    'index.astro': generateAstroComponentUsage(
      componentName,
      opts.playerImport ?? `../components/${componentName}.svelte`,
      media
    ),
  };
}
