/**
 * Ambient type declarations for site modules imported via tsdown aliases.
 *
 * The CLI bundles code from `site/src/utils/installation/` at build time using
 * tsdown's `alias` config. These declarations let `tsc` typecheck against the
 * same signatures without following into the site source tree.
 */

declare module '@/utils/installation/types' {
  export type Renderer =
    | 'background-video'
    | 'dash'
    | 'hls'
    | 'html5-audio'
    | 'html5-video'
    | 'mux-audio'
    | 'mux-video'
    | 'vimeo';
  export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio' | 'none';
  export type UseCase = 'default-video' | 'default-audio' | 'background-video';
  export type InstallMethod = 'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun';
  export const VALID_RENDERERS: Record<UseCase, Renderer[]>;
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

  type ValidationResult = { valid: true } | { valid: false; reason: string };

  export function validateInstallationOptions(opts: InstallationOptions): ValidationResult;

  export function generateHTMLInstallCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>,
    cdnMediaSubpaths: readonly string[]
  ): Record<'cdn' | 'npm' | 'pnpm' | 'yarn' | 'bun', string>;

  export function generateReactInstallCode(): Record<'npm' | 'pnpm' | 'yarn' | 'bun', string>;

  export function generateHTMLUsageCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer' | 'sourceUrl' | 'installMethod'>
  ): { html: string; js?: string };

  export function generateReactCreateCode(
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
  ): Record<'MyPlayer.tsx', string>;

  export function generateReactUsageCode(
    opts: Pick<InstallationOptions, 'renderer' | 'sourceUrl'>
  ): Record<'App.tsx', string>;
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
