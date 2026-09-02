import type { ComponentMeta } from 'vjsc/components';

export interface SkinComponentMeta extends ComponentMeta {
  readonly type: 'component';
  readonly title: string;
  readonly description: string;
}

export interface SkinMeta extends ComponentMeta {
  readonly type: 'skin';
  readonly title: string;
  readonly description: string;
}

/** Build-time styling identity of one skin: its CSS scope, theme, and preset. Keyed by skin name in `skinStyles`. */
export interface SkinStyle {
  readonly scope: string;
  readonly theme: 'default' | 'minimal';
  readonly preset: 'video' | 'audio' | 'live-video' | 'live-audio';
}

export type SkinModuleMeta = SkinComponentMeta | SkinMeta;

export const skinStyles = {
  'default-video': {
    scope: '.media-skin[data-theme="default"][data-preset="video"]',
    theme: 'default',
    preset: 'video',
  },
  'minimal-video': {
    scope: '.media-skin[data-theme="minimal"][data-preset="video"]',
    theme: 'minimal',
    preset: 'video',
  },
  'default-live-video': {
    scope: '.media-skin[data-theme="default"][data-preset="live-video"]',
    theme: 'default',
    preset: 'live-video',
  },
  'minimal-live-video': {
    scope: '.media-skin[data-theme="minimal"][data-preset="live-video"]',
    theme: 'minimal',
    preset: 'live-video',
  },
  'default-live-audio': {
    scope: '.media-skin[data-theme="default"][data-preset="live-audio"]',
    theme: 'default',
    preset: 'live-audio',
  },
  'minimal-live-audio': {
    scope: '.media-skin[data-theme="minimal"][data-preset="live-audio"]',
    theme: 'minimal',
    preset: 'live-audio',
  },
  'default-audio': {
    scope: '.media-skin[data-theme="default"][data-preset="audio"]',
    theme: 'default',
    preset: 'audio',
  },
  'minimal-audio': {
    scope: '.media-skin[data-theme="minimal"][data-preset="audio"]',
    theme: 'minimal',
    preset: 'audio',
  },
} as const satisfies Record<string, SkinStyle>;

export type SkinName = keyof typeof skinStyles;

export function isSkinName(value: string): value is SkinName {
  return value in skinStyles;
}
