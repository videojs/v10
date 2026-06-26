import { isAbsolute, resolve as resolvePath } from 'node:path';
import type ts from 'typescript';
import type { CompilerContext, CompilerPlugin } from '../config';
import { diagnosticLocationFromNode } from '../diagnostics';
import { tagName } from '../jsx';
import {
  buildTokenEnv,
  classNameScanner,
  collectExtractUtilities,
  collectUtilities,
  type DeriveClassNameOptions,
  DiagnosticError,
  defineStylingPlugin,
  deriveClassName,
  isClassNameStyleReference,
  type ResolveName,
  type ResolveTokenModule,
  rewriteStyleAttribute,
  type StyleAttributeSegmentsInfo,
  type StyleResolution,
  type StyleSegment,
  type StylingPlugin,
  styling,
  type TokenEnv,
  type TokenValue,
} from '../styles';
import { cssAssets } from './css/assets';
import { type CompiledRule, type HoistOptions, type RegisteredPropertiesOptions, renderCss } from './css/render';
import { type DesignSystem, loadDesignSystem } from './design-system';
import { analyzeUtility, type UtilityCss } from './utility-css';

/** Styling mode for Tailwind-backed className handling. */
export type TailwindMode =
  /** Pass-through. JSX `className` values stay as authored. No CSS emitted. */
  | 'preserve'
  /**
   * Flatten every className array and dotted token reference to a single
   * literal utility string on each `className` prop. No CSS emitted; token
   * imports become unused (handled by `dropUnusedImports`).
   */
  | 'inline'
  /**
   * Rewrite each `className` value to a semantic CSS class name and return CSS
   * as compiler assets.
   */
  | 'extract';

/** Per-rule grouping hook. */
export type ResolveGroup = (info: { className: string; segments: readonly StyleSegment[] }) => string | undefined;

export interface TailwindResolveOptions {
  /** Resolve bare token imports in skin sources to token modules on disk. Relative imports use the default resolver. */
  tokenModule?: ResolveTokenModule | undefined;
  /** Resolve the final CSS class name from component/token/literal candidates. */
  name?: ResolveName | undefined;
  /** Assign an extracted rule to a logical CSS group. */
  group?: ResolveGroup | undefined;
}

export interface TailwindEmitOptions {
  /** CSS emission layout. Defaults to merged output. */
  mode?: 'merged' | 'split';
  /** Base CSS files to prepend to emitted output. */
  baseCss?: readonly string[];
  /** Directory used to resolve relative base CSS paths. */
  configDir?: string;
}

export interface TailwindVarsOptions {
  /** Hoist uniform custom property declarations to a root selector, or disable explicitly. */
  hoist?: false | HoistOptions | undefined;
  /** Inline matching custom properties into values that reference them. */
  inline?: true | RegExp | undefined;
  /** Handle registered @property variables such as Tailwind's --tw-* vars. */
  properties?: RegisteredPropertiesOptions | undefined;
}

export interface TailwindOptions {
  /** Styling mode. Defaults to `'preserve'`. */
  mode?: TailwindMode | undefined;
  /** Loaded Tailwind v4 design system. Required for `'extract'` unless `input` is provided. */
  design?: DesignSystem | undefined;
  /** Tailwind CSS entry used to load the design system when `design` is omitted. */
  input?: string | undefined;
  /** CSS asset name for `'extract'`. Defaults to the compiled source basename with `.css`. */
  output?: string | undefined;
  /** Resolution hooks for token modules, generated class names, and rule groups. */
  resolve?: TailwindResolveOptions | undefined;
  /** CSS asset emission options for extract mode. */
  emit?: TailwindEmitOptions | undefined;
  /** CSS custom property handling options for extract mode. */
  vars?: TailwindVarsOptions | undefined;
  /** Styling pipeline plugins that run around Tailwind's default stages. */
  plugins?: readonly StylingPlugin[] | undefined;
}

interface TailwindPipelineState {
  mode: TailwindMode;
  sourcePath?: string | undefined;
  design?: DesignSystem | undefined;
  env?: TokenEnv | undefined;
  rules: CompiledRule[];
  signatures: Map<string, string>;
}

interface TailwindClassNameResolution {
  info: StyleAttributeSegmentsInfo;
  utilities: readonly string[];
  passThrough: readonly ts.Expression[];
}

export function tailwind(options: TailwindOptions = {}): CompilerPlugin {
  const state: TailwindPipelineState = {
    mode: options.mode ?? 'preserve',
    rules: [],
    signatures: new Map(),
  };

  return styling({
    plugins: [
      tailwindConfigStage(options, state),
      classNameScanner(),
      tailwindResolveStage(state),
      tailwindTransformStage(options, state),
      tailwindRenderStage(options, state),
      ...(options.plugins ?? []),
    ],
  });
}

function tailwindConfigStage(options: TailwindOptions, state: TailwindPipelineState): StylingPlugin {
  return defineStylingPlugin({
    name: 'tailwind:config',
    async config(context) {
      state.mode = options.mode ?? 'preserve';
      state.sourcePath = context.compiler.filename;
      state.env = buildTokenEnv(state.sourcePath, options.resolve?.tokenModule);
      state.rules = [];
      state.signatures = new Map();
      if (state.mode === 'extract') {
        state.design = await resolveDesignSystem(options, context.compiler);
      }
    },
  });
}

function tailwindResolveStage(state: TailwindPipelineState): StylingPlugin {
  return defineStylingPlugin({
    name: 'tailwind:resolve',
    resolve(reference) {
      if (state.mode === 'preserve') return null;
      if (!isClassNameStyleReference(reference)) return null;
      const info = reference.data.info;
      if (info.kind !== 'segments') return null;

      const env = state.env?.values ?? new Map<string, TokenValue>();
      if (state.mode === 'inline') {
        const utilities = collectUtilities(info.segments, env);
        if (utilities === null) return null;
        return tailwindResolution(reference, { info, utilities, passThrough: [] });
      }

      return tailwindResolution(reference, { info, ...collectExtractUtilities(info.segments, env) });
    },
  });
}

function tailwindTransformStage(options: TailwindOptions, state: TailwindPipelineState): StylingPlugin {
  return defineStylingPlugin({
    name: 'tailwind:transform',
    transform(resolution, context) {
      if (resolution.kind !== 'tailwind:className') return null;
      const data = resolution.data as TailwindClassNameResolution;

      if (state.mode === 'inline') {
        return {
          element: rewriteStyleAttribute(
            data.info,
            context.factory.createStringLiteral(data.utilities.join(' ')),
            context.factory
          ),
        };
      }

      if (state.mode !== 'extract') return null;
      if (!state.design) throw new Error('@videojs/compiler: tailwind extract mode requires `design` or `input`');

      const segments = data.info.segments;
      const naming: DeriveClassNameOptions = {
        element: data.info.element,
        segments,
        ...(options.resolve?.name ? { resolveName: options.resolve.name } : {}),
        ...(state.env?.hasSource ? { tokenNamespaces: state.env.namespaces, tokenRoots: state.env.roots } : {}),
      };
      const derived = deriveClassName(naming);
      const preserved: string[] = [];
      const ruleUtilities: string[] = [];

      for (const utility of data.utilities) {
        const css = analyzeUtility(utility, state.design);
        if (css && css.declarations.length > 0) {
          ruleUtilities.push(utility);
          state.rules.push(buildCompiledRule(derived.className, css, segments, options.resolve?.group));
          continue;
        }
        if (!preserved.includes(utility)) preserved.push(utility);
      }

      if (ruleUtilities.length > 0) {
        const signature = [...ruleUtilities].sort().join(' ');
        const previous = state.signatures.get(derived.className);
        if (previous === undefined) {
          state.signatures.set(derived.className, signature);
        } else if (previous !== signature) {
          throw collisionError(data.info.element, derived.className, previous, signature);
        }
      }

      const baseName = preserved.length > 0 ? `${derived.className} ${preserved.join(' ')}` : derived.className;
      const replacement =
        data.passThrough.length === 0
          ? context.factory.createStringLiteral(baseName)
          : context.factory.createArrayLiteralExpression([
              context.factory.createStringLiteral(baseName),
              ...data.passThrough,
            ]);

      return { element: rewriteStyleAttribute(data.info, replacement, context.factory) };
    },
  });
}

function tailwindRenderStage(options: TailwindOptions, state: TailwindPipelineState): StylingPlugin {
  return defineStylingPlugin({
    name: 'tailwind:render',
    async render(_bundle, context) {
      if (state.mode !== 'extract' || state.rules.length === 0 || !state.design) return null;
      const vars = options.vars;
      const rendered = await renderCss({
        rules: state.rules,
        ...(options.emit ?? {}),
        ...(vars?.hoist !== undefined ? { hoist: vars.hoist } : {}),
        ...(vars?.inline !== undefined ? { inlineVars: vars.inline } : {}),
        ...(vars?.properties ? { properties: vars.properties } : {}),
        resolveThemeVar: (name) => state.design!.resolveThemeVar(name),
        ...(vars?.hoist ? { themeSelector: vars.hoist.rootSelector } : {}),
      });
      return cssAssets(context.compiler, options.output, rendered);
    },
  });
}

function tailwindResolution(
  reference: StyleResolution['reference'],
  data: TailwindClassNameResolution
): StyleResolution<TailwindClassNameResolution> {
  return { kind: 'tailwind:className', reference, data };
}

async function resolveDesignSystem(options: TailwindOptions, context: CompilerContext): Promise<DesignSystem> {
  if (options.design) return options.design;
  if (!options.input) {
    throw new Error('@videojs/compiler: tailwind extract mode requires `input` when `design` is not provided');
  }
  const input = isAbsolute(options.input) ? options.input : resolvePath(context.configDir, options.input);
  return loadDesignSystem(input);
}

function buildCompiledRule(
  className: string,
  utility: UtilityCss,
  segments: readonly StyleSegment[],
  resolveGroup: ResolveGroup | undefined
): CompiledRule {
  const group = resolveGroup?.({ className, segments });
  return group === undefined ? { className, utility } : { className, utility, group };
}

function collisionError(element: ts.Node, className: string, first: string, next: string): DiagnosticError {
  const tag = tagName(element as Parameters<typeof tagName>[0]);
  return new DiagnosticError(
    `style extraction: class name '${className}' is derived from elements with different styles` +
      `.\n` +
      `  <${tag}> resolves to: ${next}\n` +
      `  an earlier element resolved to: ${first}\n` +
      `Merging these would put conflicting declarations in a single '.${className}' rule. ` +
      `Disambiguate with a distinct token, a distinct component, or \`resolve.name\`.`,
    { ...diagnosticLocationFromNode(element), diagnosticCode: 'style-class-collision' }
  );
}
