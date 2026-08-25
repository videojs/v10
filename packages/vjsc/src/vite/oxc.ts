import type { Program } from '@oxc-project/types';
import { isFunction, isString } from '@videojs/utils/predicate';
import MagicString from 'magic-string';
import type { ModuleType, Plugin, TransformPluginContext, TransformResult } from 'rolldown';

import { moduleFilename } from '../utils/module-id';

interface RolldownTransformOptions {
  readonly moduleType: ModuleType;
  readonly ssr?: boolean | undefined;
  readonly ast: Program;
  readonly magicString: MagicString;
}

interface ViteTransformOptions {
  readonly moduleType: ModuleType;
  readonly ssr?: boolean | undefined;
}

type RolldownTransformHandler = (
  this: TransformPluginContext,
  code: string,
  id: string,
  options: RolldownTransformOptions
) => TransformResult | Promise<TransformResult>;

export type VitePlugin = Plugin & { readonly enforce?: 'pre' | 'post' | undefined };
export type ViteOxcPlugin = VitePlugin & { readonly enforce: 'pre' };

/** Adapt a transform that consumes Rolldown's AST metadata to Vite's transform contract. */
export function viteOxcPlugin(plugin: Plugin): ViteOxcPlugin {
  const transform = plugin.transform;
  if (!transform) return { ...plugin, enforce: 'pre' };

  const handler = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
    isFunction(transform) ? transform : transform.handler
  ) as RolldownTransformHandler;

  const wrapped = async function (
    this: TransformPluginContext,
    code: string,
    id: string,
    options?: ViteTransformOptions
  ): Promise<TransformResult> {
    const filename = moduleFilename(id);
    const moduleType = options?.moduleType ?? scriptModuleType(filename);
    const magicString = new MagicString(code, { filename });
    const ast = this.parse(code, { lang: parserLanguage(moduleType, filename) });

    const result = await handler.call(this, code, id, {
      ...options,
      moduleType,
      ast,
      magicString,
    });

    if (!result || isString(result) || result.code === undefined || isString(result.code)) {
      return result;
    }

    return {
      ...result,
      code: result.code.toString(),
      map:
        result.map ??
        magicString
          .generateMap({
            hires: true,
            includeContent: true,
            source: filename,
          })
          .toString(),
    };
  };

  return {
    ...plugin,
    enforce: 'pre',
    transform: isFunction(transform) ? wrapped : { ...transform, handler: wrapped },
  };
}

function scriptModuleType(filename: string): ModuleType {
  if (/\.tsx$/.test(filename)) return 'tsx';
  if (/\.jsx$/.test(filename)) return 'jsx';
  if (/\.(?:ts|mts|cts)$/.test(filename)) return 'ts';
  return 'js';
}

function parserLanguage(moduleType: ModuleType, filename: string): 'js' | 'jsx' | 'ts' | 'tsx' | 'dts' {
  if (/\.d\.(?:ts|mts|cts)$/.test(filename)) return 'dts';
  if (moduleType === 'jsx') return 'jsx';
  if (moduleType === 'ts') return 'ts';
  if (moduleType === 'tsx') return 'tsx';
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ scriptModuleType(
    filename
  ) as 'js' | 'jsx' | 'ts' | 'tsx';
}
