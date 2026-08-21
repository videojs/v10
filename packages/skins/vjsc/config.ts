import type { VjscModule, VjscModuleConfig } from 'vjsc/plugins';
import { createStyleOptions } from './style';
import { createComponentTargets } from './target';
import { validateSkinConfig } from './transform';

export function configureSkinModule({ parameters }: VjscModule): VjscModuleConfig | null {
  const config = validateSkinConfig(parameters);
  if (!config) return null;

  return {
    targets: createComponentTargets(config),
    styles: createStyleOptions(config),
  };
}
