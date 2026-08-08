import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, posix, relative, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import type { ArtifactGraph } from '@videojs/compiler/artifacts';
import { rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import { createStyleClassRegistry, type StyleClassRegistry } from '@videojs/compiler/tailwind';
import { type DeclarationBlock, type Rule, transform } from 'lightningcss';
import {
  type CreateFrameworkSourceOutputOptions,
  createExtractedStyleFile,
  createFrameworkSourceOutput,
  createSourceOutputFile,
  createStyleResourceFiles,
  type ResolvedSourceOutputOptions,
  relativeModulePath,
  resolveSourceFile,
  type SourceArtifactContext,
  type SourceOutputFile,
  type SourceOutputManifest,
  sourceEntryName,
  toPosixPath,
  withoutTypeScriptExtension,
} from '../../../skins/scripts/source-presets/output.ts';
import { createReactSkinSourceConfig } from '../../skins.compiler.config.ts';

export type CreateReactSourceOutputOptions = CreateFrameworkSourceOutputOptions;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Emit canonical Skin artifacts as React source. */
export function createReactSourceOutput(
  graph: ArtifactGraph,
  options: CreateReactSourceOutputOptions
): Promise<SourceOutputManifest> {
  const supportSources: string[] = [];
  const styleRegistry = options.style === 'css' ? createStyleClassRegistry() : undefined;

  return createFrameworkSourceOutput(graph, options, {
    framework: 'react',
    outputEntryName: (entry) => sourceEntryName(entry, 'react'),
    emitArtifact: (context) => emitReactArtifact(context, styleRegistry, supportSources),
    finish: (artifacts, resolved) => addSharedSupportCss(artifacts, resolved, supportSources),
  });
}

async function emitReactArtifact(
  context: SourceArtifactContext,
  styleRegistry: StyleClassRegistry | undefined,
  supportSources: string[]
): Promise<SourceOutputFile[]> {
  const canonical = await readFile(context.inputFile, 'utf8');
  const result = await compile(canonical, {
    filename: context.inputFile,
    config: createReactSkinSourceConfig({
      style: context.options.style,
      iconSet: context.options.iconSet,
      ...(context.options.style === 'css' ? { tailwindInput: context.tailwindInput } : {}),
      ...(styleRegistry ? { styleRegistry } : {}),
    }),
    configDir: resolve(context.options.rootDir, context.artifactDir),
    outputFile: resolve(context.options.rootDir, context.entryFile),
  });
  if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    throw new Error(`Artifact \`${context.artifact.id}\` failed React source emission.`);
  }

  let entrySource = rewriteRelativeImports(result.code, context);
  const files = await createStyleResourceFiles(context);
  if (context.options.style === 'tailwind') {
    const tailwindImport = relativeModulePath(
      posix.dirname(context.entryFile),
      posix.join(context.options.targetRoot, 'styles/tailwind.css')
    );
    entrySource = `import '${tailwindImport}';\n${entrySource}`;
  } else {
    const extractedCss = result.assets.find((asset) => !asset.fileName.endsWith('.support.css'))?.source ?? '';
    const supportCss = result.assets.find((asset) => asset.fileName.endsWith('.support.css'))?.source;
    files.push(createExtractedStyleFile(context, extractedCss, { support: true }));
    entrySource = `import './styles.css';\n${entrySource}`;
    if (supportCss) supportSources.push(supportCss);
  }

  files.push(createSourceOutputFile(context.options, context.entryFile, entrySource));
  return files;
}

function rewriteRelativeImports(source: string, context: SourceArtifactContext): string {
  return rewriteModuleSpecifiers(source, {
    filename: context.entryFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceFile(context.inputFile, specifier);
      const dependency = context.layoutsByInput.get(importedFile);
      if (!existsSync(importedFile)) {
        throw new Error(
          `Artifact \`${context.artifact.id}\` has unresolved relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      if (!dependency) {
        throw new Error(
          `Artifact \`${context.artifact.id}\` cannot map relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      return relativeModulePath(dirname(context.entryFile), withoutTypeScriptExtension(dependency.entryFile));
    },
  });
}

function addSharedSupportCss(
  artifacts: Record<string, SourceOutputFile[]>,
  options: ResolvedSourceOutputOptions,
  sources: readonly string[]
): void {
  if (options.style !== 'css' || sources.length === 0) return;
  const support = consolidateSupportCss(sources);
  for (const files of Object.values(artifacts)) {
    files.push(createSourceOutputFile(options, posix.join(options.targetRoot, 'styles/support.css'), support));
  }
}

function consolidateSupportCss(sources: readonly string[]): string {
  const result = transform({
    filename: 'support.css',
    code: encoder.encode(sources.join('\n')),
    visitor: {
      StyleSheet(stylesheet) {
        const rules: Rule[] = [];
        const seen = new Set<string>();
        let theme: Extract<Rule, { type: 'style' }> | undefined;

        for (const rule of stylesheet.rules) {
          if (isMediaSkinRule(rule)) {
            if (!theme) theme = structuredClone(rule);
            else appendDeclarations(theme.value.declarations, rule.value.declarations);
            continue;
          }

          const key = JSON.stringify(rule);
          if (seen.has(key)) continue;
          seen.add(key);
          rules.push(structuredClone(rule));
        }

        return withoutNullValues({
          ...stylesheet,
          rules: theme ? [theme, ...rules] : rules,
          licenseComments: [...new Set(stylesheet.licenseComments)],
        });
      },
    },
  });
  return decoder.decode(result.code).trim();
}

function isMediaSkinRule(rule: Rule): rule is Extract<Rule, { type: 'style' }> {
  if (rule.type !== 'style' || rule.value.selectors.length !== 1) return false;
  const selector = rule.value.selectors[0];
  return selector?.length === 1 && selector[0]?.type === 'class' && selector[0].name === 'media-skin';
}

function appendDeclarations(target: DeclarationBlock, source: DeclarationBlock): void {
  target.declarations.push(...structuredClone(source.declarations));
  target.importantDeclarations.push(...structuredClone(source.importantDeclarations));
}

/** Lightning CSS returns optional AST fields as `null`, but accepts only omitted fields when serializing visitors. */
function withoutNullValues<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNullValues) as T;
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === null) delete record[key];
    else record[key] = withoutNullValues(record[key]);
  }
  return value;
}
