import type { Plugin } from 'rolldown';
import { createVjscPlugin, type VjscTransformContext, type VjscTransformer } from '../bundle/plugin';
import { createSchemaPlugin, type SchemaPlugin, type SchemaPluginOptions } from '../bundle/schema';
import { createShadcnPlugin, type ShadcnPlugin, type ShadcnPluginOptions } from '../bundle/shadcn';
import type { CompilerConfig } from '../config';
import type { SourceDefinition } from '../shadcn/source/define';

export type { Plugin } from 'rolldown';
export type {
  SchemaPlugin,
  SchemaPluginOptions,
  ShadcnPlugin,
  ShadcnPluginOptions,
  VjscTransformContext,
  VjscTransformer,
};

/** A native Rolldown ID pattern accepted by include and exclude filters. */
export type FilterPattern = string | RegExp | readonly (string | RegExp)[];

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

/** Apply VJSC transforms through Rolldown or a Rolldown-compatible host. */
export function vjscPlugin(options: VjscPluginOptions = {}): Plugin {
  const { include, exclude, ...transformOptions } = options;
  return createVjscPlugin(transformOptions, {
    hook: {
      id: {
        include: normalizeFilter(include ?? /\.tsx(?:\?|$)/),
        ...(exclude ? { exclude: normalizeFilter(exclude) } : {}),
      },
    },
  });
}

function normalizeFilter(pattern: FilterPattern): string | RegExp | (string | RegExp)[] {
  return Array.isArray(pattern) ? [...pattern] : (pattern as string | RegExp);
}

export function schemaPlugin(options: SchemaPluginOptions): SchemaPlugin {
  return createSchemaPlugin(options);
}

export function shadcnPlugin<const Definition extends SourceDefinition>(
  options: ShadcnPluginOptions<Definition>
): ShadcnPlugin {
  return createShadcnPlugin(options);
}
