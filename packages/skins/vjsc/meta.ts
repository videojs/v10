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
    scope: 'media-skin-video',
    theme: 'default',
    variant: 'default',
  },
  'minimal-video': {
    scope: 'media-skin-video-minimal',
    theme: 'minimal',
    variant: 'minimal',
  },
} as const satisfies Record<string, SkinMeta['style']>;

export type SkinName = keyof typeof skinStyles;
