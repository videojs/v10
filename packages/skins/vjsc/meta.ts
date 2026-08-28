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
  readonly style: {
    readonly scope: string;
    readonly theme: 'default' | 'minimal';
    readonly variant: string;
  };
}

export type SkinModuleMeta = SkinComponentMeta | SkinMeta;

export const skinStyles = {
  'default-video': {
    scope: '.media-skin--default.media-skin--video',
    theme: 'default',
    variant: 'default',
  },
  'minimal-video': {
    scope: '.media-skin--minimal.media-skin--video',
    theme: 'minimal',
    variant: 'minimal',
  },
  'default-live-video': {
    scope: '.media-skin--default.media-skin--live-video',
    theme: 'default',
    variant: 'default-live-video',
  },
  'minimal-live-video': {
    scope: '.media-skin--minimal.media-skin--live-video',
    theme: 'minimal',
    variant: 'minimal-live-video',
  },
  'default-audio': {
    scope: '.media-skin--default.media-skin--audio',
    theme: 'default',
    variant: 'default-audio',
  },
  'minimal-audio': {
    scope: '.media-skin--minimal.media-skin--audio',
    theme: 'minimal',
    variant: 'minimal-audio',
  },
} as const satisfies Record<string, SkinMeta['style']>;

export type SkinName = keyof typeof skinStyles;
