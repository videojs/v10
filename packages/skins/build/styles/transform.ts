import { dirname, resolve } from 'node:path';
import type { CompilerPlugin } from '@videojs/compiler';
import { collectReferencedIdentifiers, replaceJsxPropValue } from '@videojs/compiler/ast';
import ts from 'typescript';
import { type ClassNameInfo, type ClassNameSegment, classNameSegment, readClassName } from './jsx-class-name';
import { isGroupPeerMarker, recipeForToken, type SkinStyleManifest } from './manifest';

export type SkinStyleTarget = 'tailwind' | 'vanilla';

interface TokenReference {
  modulePath: string;
  tokenPath: readonly string[];
}

interface SourceBindings {
  styleImports: ReadonlyMap<string, string>;
  importedModules: ReadonlySet<string>;
}

interface ResolvedClassName {
  classes: readonly string[];
  passThrough: readonly ts.Expression[];
}

interface SkinStylesOptions {
  manifest: SkinStyleManifest;
  target: SkinStyleTarget;
}

/** Project explicit canonical style references to Tailwind utilities or semantic classes. */
export function skinStyles(options: SkinStylesOptions): CompilerPlugin {
  return {
    name: '@videojs/skins:styles',
    setup() {
      return {
        transform: (transformContext) => {
          const factory = transformContext.factory;
          return (sourceFile) => {
            const bindings = sourceBindings(sourceFile, options.manifest);
            if (bindings.styleImports.size === 0) return sourceFile;

            const visit = (node: ts.Node): ts.Node => {
              if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const info = readClassName(node);
                const transformed = info ? transformStyleAttribute(info, bindings, options, factory) : node;
                return ts.visitEachChild(transformed, visit, transformContext);
              }
              return ts.visitEachChild(node, visit, transformContext);
            };

            const transformed = ts.visitEachChild(sourceFile, visit, transformContext);
            return stripStyleBindings(transformed, bindings);
          };
        },
      };
    },
  };
}

function stripStyleBindings(sourceFile: ts.SourceFile, bindings: SourceBindings): ts.SourceFile {
  const statements = sourceFile.statements.filter(
    (statement) =>
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !bindings.importedModules.has(statement.moduleSpecifier.text)
  );
  const output = ts.factory.updateSourceFile(sourceFile, statements);
  const styleNames = new Set(bindings.styleImports.keys());
  const unresolved = new Set([...collectReferencedIdentifiers(output)].filter((name) => styleNames.has(name)));
  if (unresolved.size > 0) {
    throw new Error(
      `Skin styles in \`${sourceFile.fileName}\` must use static className references. ` +
        `Could not transform: ${[...unresolved].sort().join(', ')}.`
    );
  }
  return output;
}

function transformStyleAttribute(
  info: ClassNameInfo,
  bindings: SourceBindings,
  options: SkinStylesOptions,
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (info.kind === 'opaque' && ts.isConditionalExpression(info.expression)) {
    const whenTrue = resolveExpression(info.expression.whenTrue, bindings, options);
    const whenFalse = resolveExpression(info.expression.whenFalse, bindings, options);
    if (!whenTrue || !whenFalse || whenTrue.passThrough.length > 0 || whenFalse.passThrough.length > 0) {
      return info.element;
    }
    return replaceJsxPropValue(
      info,
      factory.updateConditionalExpression(
        info.expression,
        info.expression.condition,
        info.expression.questionToken,
        factory.createStringLiteral(whenTrue.classes.join(' ')),
        info.expression.colonToken,
        factory.createStringLiteral(whenFalse.classes.join(' '))
      ),
      factory
    );
  }
  if (info.kind !== 'segments') return info.element;

  const resolved = resolveSegments(info.segments, bindings, options);
  if (!resolved || (resolved.classes.length === 0 && resolved.passThrough.length === 0)) return info.element;
  const literal = factory.createStringLiteral(resolved.classes.join(' '));
  const replacement =
    resolved.passThrough.length === 0
      ? literal
      : factory.createArrayLiteralExpression([literal, ...resolved.passThrough]);
  return replaceJsxPropValue(info, replacement, factory);
}

function resolveExpression(
  expression: ts.Expression,
  bindings: SourceBindings,
  options: SkinStylesOptions
): ResolvedClassName | undefined {
  const expressions = ts.isArrayLiteralExpression(expression)
    ? expression.elements.filter((element): element is ts.Expression => !ts.isSpreadElement(element))
    : [expression];
  if (ts.isArrayLiteralExpression(expression) && expressions.length !== expression.elements.length) return undefined;
  return resolveSegments(expressions.map(classNameSegment), bindings, options);
}

function resolveSegments(
  segments: readonly ClassNameSegment[],
  bindings: SourceBindings,
  options: SkinStylesOptions
): ResolvedClassName | undefined {
  const classes: string[] = [];
  const passThrough: ts.Expression[] = [];

  for (const segment of segments) {
    if (segment.kind === 'literal') {
      pushClasses(classes, segment.value);
      continue;
    }
    if (segment.kind === 'opaque') {
      passThrough.push(segment.node);
      continue;
    }
    const reference = resolveTokenReference(segment.path, bindings.styleImports);
    const recipe = reference ? recipeForToken(options.manifest, reference.modulePath, reference.tokenPath) : undefined;
    if (!recipe) {
      passThrough.push(segment.node);
      continue;
    }
    if (options.target === 'vanilla') {
      classes.push(recipe.className);
    } else {
      classes.push(...recipe.utilities);
    }
  }

  const outputClasses =
    options.target === 'vanilla' ? classes.filter((className) => !isGroupPeerMarker(className)) : classes;
  return { classes: [...new Set(outputClasses)], passThrough };
}

function sourceBindings(sourceFile: ts.SourceFile, manifest: SkinStyleManifest): SourceBindings {
  const styleImports = new Map<string, string>();
  const importedModules = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const modulePath = resolveStyleModule(sourceFile.fileName, statement.moduleSpecifier.text, manifest);
    if (!modulePath) continue;
    const importClause = statement.importClause;
    if (!importClause?.name || importClause.namedBindings) {
      throw new Error(
        `Skin style import \`${statement.moduleSpecifier.text}\` in \`${sourceFile.fileName}\` must use a default import.`
      );
    }
    styleImports.set(importClause.name.text, modulePath);
    importedModules.add(statement.moduleSpecifier.text);
  }

  return { styleImports, importedModules };
}

function resolveStyleModule(sourceFile: string, specifier: string, manifest: SkinStyleManifest): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const imported = resolve(dirname(sourceFile), specifier);
  for (const modulePath of manifest.modules.keys()) {
    if (modulePath === imported || modulePath === `${imported}.ts`) return modulePath;
  }
  return undefined;
}

function resolveTokenReference(
  path: readonly string[],
  styleImports: ReadonlyMap<string, string>
): TokenReference | undefined {
  const [root, ...tail] = path;
  if (!root) return undefined;
  const modulePath = styleImports.get(root);
  return modulePath ? { modulePath, tokenPath: tail } : undefined;
}

function pushClasses(output: string[], value: string): void {
  for (const className of value.split(/\s+/)) {
    if (className) output.push(className);
  }
}
