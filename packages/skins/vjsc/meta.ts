import type { VjscModuleMeta } from 'vjsc';

export interface ComponentMeta extends VjscModuleMeta {
  readonly type: 'component';
  readonly title: string;
  readonly description: string;
}

export interface SkinMeta extends VjscModuleMeta {
  readonly type: 'skin';
  readonly title: string;
  readonly description: string;
  readonly style: {
    readonly scope: string;
    readonly theme: 'default' | 'minimal';
    readonly variant: string;
  };
}

export type SkinModuleMeta = ComponentMeta | SkinMeta;
