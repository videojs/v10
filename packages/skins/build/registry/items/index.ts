import type { VjscRegistryOptions } from '../../../../vjsc/src/shadcn/index.ts';
import type { SkinModuleMeta } from '../../../src/meta.ts';
import type { RegistryTarget } from '../targets.ts';
import { htmlRegistryItems } from './html.ts';
import { reactRegistryItems } from './react.ts';

export function registryItems(target: RegistryTarget): VjscRegistryOptions<SkinModuleMeta>['items'] {
  return target.framework === 'html' ? htmlRegistryItems(target) : reactRegistryItems(target);
}
