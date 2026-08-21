import { vjscPlugin as createVjscPlugin } from '../plugins/vjsc';
import { type ViteOxcPlugin, viteOxcPlugin } from './oxc';

export type { VjscModule, VjscModuleConfig, VjscPluginOptions } from '../plugins/vjsc';

/** Create the Vite-adapted VJSC compiler pipeline. */
export function vjscPlugin(...args: Parameters<typeof createVjscPlugin>): ViteOxcPlugin[] {
  return createVjscPlugin(...args).map(viteOxcPlugin);
}
