import { createPluginPipeline, type VjscPluginOptions as BaseVjscPluginOptions } from '../plugins/vjsc';
import type { StyleDiagnosticsOptions } from '../styles/diagnostics';
import { type ViteOxcPlugin, viteOxcPlugin } from './oxc';
import { createViteStyleHmr } from './style-hmr';

export type { EntriesOptions, SourceEntry, TransformOptions } from '../plugins/vjsc';
export type { TransformModule } from '../utils/module-id';
export type { ComplexSelectorDiagnosticLevel, StyleDiagnosticsOptions } from '../styles/diagnostics';

interface ViteDiagnosticsPlugin extends ViteOxcPlugin {
  readonly apply: 'serve';
  configResolved(): void;
}

export interface VjscPluginOptions extends BaseVjscPluginOptions {
  /** Controls style warnings reported by the Vite development server. Production builds skip style diagnostics. */
  readonly diagnostics?: StyleDiagnosticsOptions | undefined;
}

/** Create the Vite-adapted VJSC compiler pipeline. */
export function vjscPlugin(options: VjscPluginOptions): ViteOxcPlugin[] {
  const styleHmr = createViteStyleHmr();
  let dev = false;
  const devDiagnostics: ViteDiagnosticsPlugin = {
    name: 'vjsc:dev-diagnostics',
    apply: 'serve',
    enforce: 'pre',
    configResolved() {
      dev = true;
    },
  };

  return [
    devDiagnostics,
    ...createPluginPipeline(options, styleHmr.lifecycle, () => (dev ? (options.diagnostics ?? {}) : false)).map(
      viteOxcPlugin
    ),
    styleHmr.plugin,
  ];
}
