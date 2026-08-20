import { createFilter, type FilterPattern, type Plugin } from 'vite';
import { createVjscPlugin, type VjscTransformContext, type VjscTransformer } from '../bundle/plugin';
import { createSchemaPlugin, type SchemaPluginOptions } from '../bundle/schema';
import { createShadcnPlugin, type ShadcnPluginOptions } from '../bundle/shadcn';
import type { CompilerConfig } from '../config';
import type { SourceDefinition } from '../shadcn/source/define';

export type { FilterPattern, Plugin } from 'vite';
export type { SchemaPluginOptions, ShadcnPluginOptions, VjscTransformContext, VjscTransformer };

export interface VjscPluginOptions {
  /** Modules passed to the transform hook. Defaults to TSX modules. */
  readonly include?: FilterPattern | undefined;
  /** Modules omitted from the transform hook. */
  readonly exclude?: FilterPattern | undefined;
  /** Select a VJSC transform for each module, or return null to defer. */
  readonly transform?: CompilerConfig | VjscTransformer | undefined;
  /** Directory used to resolve relative transform configuration. */
  readonly cwd?: string | undefined;
}

export interface SchemaPlugin extends Plugin {
  readonly moduleId: `virtual:vjsc/${string}`;
}

export interface ShadcnPlugin extends Plugin {
  readonly moduleId: `virtual:vjsc/${string}`;
}

/** Apply VJSC transforms through Vite using its standard module filters. */
export function vjscPlugin(options: VjscPluginOptions = {}): Plugin {
  const { include, exclude, ...transformOptions } = options;
  return createVjscPlugin(transformOptions, {
    test: createFilter(include ?? /\.tsx(?:\?|$)/, exclude),
  }) as unknown as Plugin;
}

export function schemaPlugin(options: SchemaPluginOptions): SchemaPlugin {
  return createSchemaPlugin(options) as SchemaPlugin;
}

export function shadcnPlugin<const Definition extends SourceDefinition>(
  options: ShadcnPluginOptions<Definition>
): ShadcnPlugin {
  return createShadcnPlugin(options) as ShadcnPlugin;
}
