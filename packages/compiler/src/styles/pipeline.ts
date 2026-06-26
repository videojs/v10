import ts from 'typescript';
import type { CompilerAsset, CompilerContext, CompilerPipelineStep, CompilerPlugin } from '../config';
import type { JsxElementLike } from '../jsx';
import { readStyleAttribute, type StyleAttributeInfo } from './analyze';

export type StylingPluginEnforce = 'pre' | 'post';

export interface StyleReference<Data = unknown> {
  kind: string;
  element: JsxElementLike;
  node?: ts.Node | undefined;
  data: Data;
}

export interface StyleResolution<Data = unknown> {
  kind: string;
  reference: StyleReference;
  data: Data;
}

export interface StyleTransformResult {
  element?: JsxElementLike | undefined;
}

export type StylingAsset = CompilerAsset;

export interface CssBundle {
  assets: StylingAsset[];
  meta: Map<unknown, unknown>;
}

export interface StylingContextBase {
  compiler: CompilerContext;
  plugins: readonly StylingPlugin[];
  meta: Map<unknown, unknown>;
}

export interface StylingConfigContext extends StylingContextBase {}

export interface StylingScanContext extends StylingContextBase {
  sourceFile: ts.SourceFile;
  factory: ts.NodeFactory;
}

export interface StylingResolveContext extends StylingContextBase {
  sourceFile: ts.SourceFile;
  factory: ts.NodeFactory;
}

export interface StylingTransformContext extends StylingContextBase {
  sourceFile: ts.SourceFile;
  factory: ts.NodeFactory;
  currentElement: JsxElementLike;
}

export interface StylingGenerateContext extends StylingContextBase {}

export interface StylingRenderContext extends StylingContextBase {}

export interface StylingEmitContext extends StylingContextBase {}

export interface StylingPlugin {
  name: string;
  enforce?: StylingPluginEnforce | undefined;
  config?(context: StylingConfigContext): void | Promise<void>;
  scan?(
    element: JsxElementLike,
    context: StylingScanContext
  ): StyleReference | readonly StyleReference[] | null | undefined;
  resolve?(reference: StyleReference, context: StylingResolveContext): StyleResolution | null | undefined;
  transform?(resolution: StyleResolution, context: StylingTransformContext): StyleTransformResult | null | undefined;
  generate?(bundle: CssBundle, context: StylingGenerateContext): void | Promise<void>;
  render?(
    bundle: CssBundle,
    context: StylingRenderContext
  ): readonly StylingAsset[] | null | undefined | Promise<readonly StylingAsset[] | null | undefined>;
  emit?(assets: readonly StylingAsset[], context: StylingEmitContext): void | Promise<void>;
}

export interface StylingOptions {
  plugins?: readonly StylingPlugin[] | undefined;
}

export interface ClassNameReferenceData {
  info: StyleAttributeInfo;
}

export interface ClassNameStyleReference extends StyleReference<ClassNameReferenceData> {
  kind: 'className';
}

export function defineStylingPlugin<const Plugin extends StylingPlugin>(plugin: Plugin): Plugin {
  return plugin;
}

export function classNameScanner(): StylingPlugin {
  return defineStylingPlugin({
    name: 'class-name-scanner',
    scan(element) {
      const info = readStyleAttribute(element);
      if (!info) return null;
      return {
        kind: 'className',
        element,
        node: info.attribute,
        data: { info },
      } satisfies ClassNameStyleReference;
    },
  });
}

export function isClassNameStyleReference(reference: StyleReference): reference is ClassNameStyleReference {
  return reference.kind === 'className' && isClassNameReferenceData(reference.data);
}

export function styling(options: StylingOptions = {}): CompilerPlugin {
  return {
    name: 'styling',
    async setup(compiler): Promise<CompilerPipelineStep> {
      const plugins = orderStylingPlugins(options.plugins ?? []);
      const meta = new Map<unknown, unknown>();
      const base = { compiler, plugins, meta } satisfies StylingContextBase;
      const bundle: CssBundle = { assets: [], meta };

      for (const plugin of plugins) {
        await plugin.config?.(base);
      }

      return {
        transform: createStylingTransform(plugins, base),
        async finish() {
          for (const plugin of plugins) {
            await plugin.generate?.(bundle, base);
          }

          let assets: readonly StylingAsset[] | null | undefined;
          for (const plugin of plugins) {
            assets = await plugin.render?.(bundle, base);
            if (assets != null) break;
          }

          const finalAssets = assets ?? bundle.assets;
          for (const plugin of plugins) {
            await plugin.emit?.(finalAssets, base);
          }
          for (const asset of finalAssets) {
            compiler.addAsset(asset);
          }
        },
      };
    },
  };
}

function createStylingTransform(
  plugins: readonly StylingPlugin[],
  base: StylingContextBase
): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    const factory = transformContext.factory;

    return (sourceFile) => {
      const scanContext = { ...base, sourceFile, factory } satisfies StylingScanContext;
      const resolveContext = { ...base, sourceFile, factory } satisfies StylingResolveContext;

      const visitNode = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const visited = visitJsxElement(node as JsxElementLike, plugins, scanContext, resolveContext, base);
          return ts.visitEachChild(visited, visitNode, transformContext);
        }
        return ts.visitEachChild(node, visitNode, transformContext);
      };

      return ts.visitEachChild(sourceFile, visitNode, transformContext);
    };
  };
}

function visitJsxElement(
  element: JsxElementLike,
  plugins: readonly StylingPlugin[],
  scanContext: StylingScanContext,
  resolveContext: StylingResolveContext,
  base: StylingContextBase
): JsxElementLike {
  let current = element;
  const references: StyleReference[] = [];

  for (const plugin of plugins) {
    const scanned = plugin.scan?.(current, scanContext);
    references.push(...normalizeReferences(scanned));
  }

  for (const reference of references) {
    const resolution = resolveReference(reference, plugins, resolveContext);
    if (!resolution) continue;

    const transformContext = {
      ...base,
      sourceFile: scanContext.sourceFile,
      factory: scanContext.factory,
      currentElement: current,
    } satisfies StylingTransformContext;
    const result = transformResolution(resolution, plugins, transformContext);
    if (result?.element) current = result.element;
  }

  return current;
}

function resolveReference(
  reference: StyleReference,
  plugins: readonly StylingPlugin[],
  context: StylingResolveContext
): StyleResolution | null {
  for (const plugin of plugins) {
    const resolution = plugin.resolve?.(reference, context);
    if (resolution != null) return resolution;
  }
  return null;
}

function transformResolution(
  resolution: StyleResolution,
  plugins: readonly StylingPlugin[],
  context: StylingTransformContext
): StyleTransformResult | null {
  for (const plugin of plugins) {
    const result = plugin.transform?.(resolution, context);
    if (result != null) return result;
  }
  return null;
}

function normalizeReferences(value: StyleReference | readonly StyleReference[] | null | undefined): StyleReference[] {
  if (value == null) return [];
  return isStyleReferenceArray(value) ? [...value] : [value];
}

function isStyleReferenceArray(value: StyleReference | readonly StyleReference[]): value is readonly StyleReference[] {
  return Array.isArray(value);
}

function orderStylingPlugins(plugins: readonly StylingPlugin[]): StylingPlugin[] {
  const pre = plugins.filter((plugin) => plugin.enforce === 'pre');
  const normal = plugins.filter((plugin) => plugin.enforce === undefined);
  const post = plugins.filter((plugin) => plugin.enforce === 'post');
  return [...pre, ...normal, ...post];
}

function isClassNameReferenceData(value: unknown): value is ClassNameReferenceData {
  return typeof value === 'object' && value !== null && 'info' in value;
}
