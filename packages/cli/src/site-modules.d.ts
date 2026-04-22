/**
 * Ambient type declarations for site modules imported via tsdown aliases.
 *
 * The CLI bundles code from `site/src/utils/installation/` at build time using
 * tsdown's `alias` config. These declarations let `tsc` typecheck against the
 * same signatures without following into the site source tree.
 */

declare module '@/utils/installation/types' {
  export type Renderer = 'background-video' | 'hls' | 'html5-audio' | 'html5-video';
  export type Skin = 'video' | 'audio' | 'minimal-video' | 'minimal-audio';
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
    opts: Pick<InstallationOptions, 'useCase' | 'skin' | 'renderer'>
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
