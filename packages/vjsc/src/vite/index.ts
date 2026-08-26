import { createVjscPluginPipeline, type VjscPluginOptions } from '../plugins/vjsc';
import { type ViteOxcPlugin, viteOxcPlugin } from './oxc';
import { createViteStyleHmr } from './style-hmr';

export type { VjscModule, VjscModuleConfig, VjscPluginOptions } from '../plugins/vjsc';
export type { ComplexSelectorDiagnosticLevel, VjscDiagnosticsOptions } from '../styles/diagnostics';

/** Create the Vite-adapted VJSC compiler pipeline. */
export function vjscPlugin(options: VjscPluginOptions): ViteOxcPlugin[] {
  const styleHmr = createViteStyleHmr();

  return [...createVjscPluginPipeline(options, styleHmr.lifecycle).map(viteOxcPlugin), styleHmr.plugin];
}
