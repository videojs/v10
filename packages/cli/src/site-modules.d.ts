/**
 * Ambient type declarations for site modules imported via Vite+ pack aliases.
 *
 * The CLI bundles code from `site/src/utils/installation/` at build time using Vite+ pack's `alias` config. These
 * declarations let `tsc` typecheck against the same signatures without following into the site source tree.
 */

declare module '@/utils/installation/types' {
  export type Renderer =
    | 'background-video'
    | 'cloudflare'
    | 'dash'
    | 'hls'
    | 'html5-audio'
    | 'html5-video'
    | 'mux-audio'
    | 'mux-video'
    | 'spotify'
    | 'tiktok'
    | 'twitch'
    | 'vimeo'
    | 'youtube';
  export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio' | 'none';
  export type UseCase = 'default-video' | 'default-audio' | 'live-video' | 'live-audio' | 'background-video';
  export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';
  export interface InstallationPreset {
    label: string;
    flag: string;
    group: string;
    tagPrefix: string;
    componentPrefix: string;
    mediaType: 'video' | 'audio';
    live: boolean;
    renderers: readonly Renderer[];
  }
  export const INSTALLATION_SKIN_FLAGS: readonly ['default', 'minimal', 'none'];
  export const USE_CASES: UseCase[];
  export function getInstallationPreset(useCase: UseCase): InstallationPreset;
}

declare module '@/utils/installation/codegen' {
  import type { InstallMethod, Renderer, Skin, UseCase } from '@/utils/installation/types';

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

  export function validateInstallationOptions(opts: InstallationOptions): ValidationResult;

  export function generateHTMLInstallCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
    cdnMediaSubpaths: readonly string[]
  ): Record<'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun', string>;

  export function generateReactInstallCode(
    opts?: Pick<InstallationOptions, 'renderer'>
  ): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string>;

  export function generateHTMLUsageCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
  ): HTMLUsageCode;

  export function generateReactCreateCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl'>
  ): Record<'app/page.tsx', string>;

  export function generateVueCustomElementConfigCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
  ): Record<'vite.config.ts' | 'nuxt.config.ts', string>;

  export function generateVueCreateCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
  ): Record<'VideoPlayer.vue', string>;

  export function generateVueUsageCode(
    opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
  ): Record<'App.vue', string>;

  export function generateSvelteCreateCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
  ): Record<'VideoPlayer.svelte', string>;

  export function generateSvelteUsageCode(
    opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
  ): Record<'+page.svelte' | 'App.svelte', string>;

  export function generateSourceMediaInstallCode(
    renderer: Renderer
  ): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string> | null;

  export function generateSourceReactCreateCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl'>
  ): Record<'app/page.tsx', string>;

  export interface SourceHTMLUsageCode {
    imports: string;
    media: string;
    player: string;
    skinFile: string;
  }

  export function generateSourceHTMLUsageCode(
    opts: Pick<InstallationOptions, 'useCase' | 'renderer' | 'sourceUrl'>
  ): SourceHTMLUsageCode;
}

declare module '@/utils/installation/shadcn' {
  import type { Skin, UseCase } from '@/utils/installation/types';

  export type RegistryFramework = 'html' | 'react';
  export type RegistryTemplate = 'next' | 'vite' | 'start' | 'laravel' | 'react-router' | 'astro';
  export type RegistryStyling = 'css' | 'tailwind';
  export type RegistryTheme = 'default' | 'minimal';
  export type RegistryPreset = 'audio' | 'live-audio' | 'live-video' | 'video';
  export type ShadcnRunner = 'npm' | 'pnpm' | 'yarn' | 'bun';

  export const REGISTRY_STYLING_LABELS: Record<RegistryStyling, string>;
  export const REGISTRY_STYLINGS: readonly RegistryStyling[];
  export const REGISTRY_TEMPLATE_LABELS: Record<RegistryTemplate, string>;
  export const REGISTRY_TEMPLATES: readonly RegistryTemplate[];
  export const REGISTRY_THEMES: readonly RegistryTheme[];
  export const SHADCN_RUNNER_NAMES: readonly ShadcnRunner[];

  export function defaultRegistryStyling(framework: RegistryFramework): RegistryStyling;
  export function defaultRegistryTemplate(framework: RegistryFramework): RegistryTemplate;
  export function registryStylings(framework: RegistryFramework): readonly RegistryStyling[];
  export function registryTemplates(framework: RegistryFramework): readonly RegistryTemplate[];
  export function shadcnInitCommand(runner: ShadcnRunner, template: RegistryTemplate): string;
  export function registryInstallCommands(
    runner: ShadcnRunner,
    framework: RegistryFramework,
    styling: RegistryStyling,
    items: readonly string[],
    theme?: RegistryTheme
  ): string;
  export function registrySkinSelection(options: {
    useCase: UseCase;
    skin: Skin;
  }): { item: RegistryPreset; theme: RegistryTheme } | null;
}

declare module '@/utils/installation/detect-renderer' {
  import type { Renderer, UseCase } from '@/utils/installation/types';

  export interface DetectionResult {
    renderer: Renderer;
    label: string;
  }

  export function detectRenderer(url: string, useCase: UseCase): DetectionResult | null;
}

declare module '@/utils/installation/cdn-code' {
  import type { Renderer, Skin, UseCase } from '@/utils/installation/types';

  export function generateCdnCode(
    useCase: UseCase,
    skin: Skin,
    renderer: Renderer,
    cdnMediaSubpaths: readonly string[]
  ): string;
  export function rendererSupportsCdn(renderer: Renderer, cdnMediaSubpaths: readonly string[]): boolean;
}

declare module '@/utils/installation/renderer-options' {
  import type { Renderer, UseCase } from '@/utils/installation/types';

  // Mirrors the site's `SelectOption` shape, narrowed to the fields the CLI
  // uses. The site module imports that type from a React component; the CLI only
  // ever reads `value`/`label`.
  interface RendererOption {
    value: Renderer | null;
    label: string;
    disabled?: boolean;
  }

  export const RENDERER_LABELS: Record<Renderer, string>;
  export function buildOptions(useCase: UseCase): RendererOption[];
}

declare module '@/content/cdn-media.json' {
  const entries: Array<{ id: string }>;

  export default entries;
}
