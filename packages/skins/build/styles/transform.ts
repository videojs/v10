import { dirname, resolve } from 'node:path';
import type { CompilerPlugin } from '@videojs/compiler';
import {
  readStyleAttribute,
  rewriteStyleAttribute,
  type StyleAttributeInfo,
  type StyleSegment,
} from '@videojs/compiler/ast';
import ts from 'typescript';
import { isGroupPeerMarker, recipeForToken, type SkinStyleManifest, type SkinStyleRecipe } from './manifest';

export type SkinStyleTarget = 'tailwind' | 'vanilla';

export interface SkinStyleComposition {
  classNames: readonly string[];
  origin: {
    description: string;
    file?: string | undefined;
    line?: number | undefined;
    column?: number | undefined;
  };
}

export interface SkinStyleUsage {
  compositions: readonly SkinStyleComposition[];
}

export interface MutableSkinStyleUsage extends SkinStyleUsage {
  recordComposition(composition: SkinStyleComposition): void;
}

interface TokenReference {
  modulePath: string;
  tokenPath: readonly string[];
}

interface SourceBindings {
  styleImports: ReadonlyMap<string, string>;
  aliases: ReadonlyMap<string, TokenReference>;
  importedModules: ReadonlySet<string>;
}

interface ResolvedClassName {
  classes: readonly string[];
  recipes: readonly SkinStyleRecipe[];
  passThrough: readonly ts.Expression[];
}

interface SkinStylesOptions {
  manifest: SkinStyleManifest;
  target: SkinStyleTarget;
  usage?: MutableSkinStyleUsage | undefined;
}

export function createSkinStyleUsage(): MutableSkinStyleUsage {
  const compositions: SkinStyleComposition[] = [];
  const compositionKeys = new Set<string>();
  return {
    compositions,
    recordComposition(composition) {
      const classNames = [...new Set(composition.classNames)];
      if (classNames.length < 2) return;
      const key = [...classNames].sort().join('\0');
      if (compositionKeys.has(key)) return;
      compositionKeys.add(key);
      compositions.push({ ...composition, classNames });
    },
  };
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
                const info = readStyleAttribute(node);
                const transformed = info ? transformStyleAttribute(info, bindings, options, factory, sourceFile) : node;
                return ts.visitEachChild(transformed, visit, transformContext);
              }
              return ts.visitEachChild(node, visit, transformContext);
            };

            const transformed = ts.visitEachChild(sourceFile, visit, transformContext);
            return stripStyleBindings(transformed, bindings, factory);
          };
        },
      };
    },
  };
}

function stripStyleBindings(
  sourceFile: ts.SourceFile,
  bindings: SourceBindings,
  factory: ts.NodeFactory
): ts.SourceFile {
  const statements: ts.Statement[] = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      bindings.importedModules.has(statement.moduleSpecifier.text)
    ) {
      continue;
    }
    if (!ts.isVariableStatement(statement)) {
      statements.push(statement);
      continue;
    }
    const declarations = statement.declarationList.declarations.filter(
      (declaration) => !ts.isIdentifier(declaration.name) || !bindings.aliases.has(declaration.name.text)
    );
    if (declarations.length === 0) continue;
    statements.push(
      declarations.length === statement.declarationList.declarations.length
        ? statement
        : factory.updateVariableStatement(
            statement,
            statement.modifiers,
            factory.updateVariableDeclarationList(statement.declarationList, declarations)
          )
    );
  }

  const output = factory.updateSourceFile(sourceFile, statements);
  const unresolved = new Set<string>();
  const styleNames = new Set([...bindings.styleImports.keys(), ...bindings.aliases.keys()]);
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && styleNames.has(node.text)) unresolved.add(node.text);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(output, visit);
  if (unresolved.size > 0) {
    throw new Error(
      `Skin styles in \`${sourceFile.fileName}\` must use static className references. ` +
        `Could not transform: ${[...unresolved].sort().join(', ')}.`
    );
  }
  return output;
}

function transformStyleAttribute(
  info: StyleAttributeInfo,
  bindings: SourceBindings,
  options: SkinStylesOptions,
  factory: ts.NodeFactory,
  sourceFile: ts.SourceFile
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (info.kind === 'opaque' && ts.isConditionalExpression(info.expression)) {
    const whenTrue = resolveExpression(info.expression.whenTrue, bindings, options);
    const whenFalse = resolveExpression(info.expression.whenFalse, bindings, options);
    if (!whenTrue || !whenFalse || whenTrue.passThrough.length > 0 || whenFalse.passThrough.length > 0) {
      return info.element;
    }
    recordUsage(options.usage, whenTrue.recipes, info, sourceFile);
    recordUsage(options.usage, whenFalse.recipes, info, sourceFile);
    return rewriteStyleAttribute(
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
  recordUsage(options.usage, resolved.recipes, info, sourceFile);
  const literal = factory.createStringLiteral(resolved.classes.join(' '));
  const replacement =
    resolved.passThrough.length === 0
      ? literal
      : factory.createArrayLiteralExpression([literal, ...resolved.passThrough]);
  return rewriteStyleAttribute(info, replacement, factory);
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
  return resolveSegments(expressions.map(styleSegment), bindings, options);
}

function resolveSegments(
  segments: readonly StyleSegment[],
  bindings: SourceBindings,
  options: SkinStylesOptions
): ResolvedClassName | undefined {
  const classes: string[] = [];
  const recipes: SkinStyleRecipe[] = [];
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
    const reference = resolveTokenReference(segment.path, bindings);
    const recipe = reference ? recipeForToken(options.manifest, reference.modulePath, reference.tokenPath) : undefined;
    if (!recipe) {
      passThrough.push(segment.node);
      continue;
    }
    recipes.push(recipe);
    if (options.target === 'vanilla') {
      classes.push(recipe.className);
    } else {
      classes.push(...recipe.utilities);
    }
  }

  const outputClasses =
    options.target === 'vanilla' ? classes.filter((className) => !isGroupPeerMarker(className)) : classes;
  return { classes: [...new Set(outputClasses)], recipes, passThrough };
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

  const aliases = new Map<string, TokenReference>();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const path = dottedPath(declaration.initializer);
      if (!path) continue;
      const reference = resolveTokenReference(path, { styleImports, aliases });
      if (reference) aliases.set(declaration.name.text, reference);
    }
  }
  return { styleImports, aliases, importedModules };
}

function resolveStyleModule(sourceFile: string, specifier: string, manifest: SkinStyleManifest): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const imported = resolve(dirname(sourceFile), specifier);
  for (const modulePath of manifest.modules.keys()) {
    if (modulePath === imported || modulePath === `${imported}.ts`) return modulePath;
  }
  return undefined;
}

function resolveTokenReference(path: readonly string[], bindings: Pick<SourceBindings, 'styleImports' | 'aliases'>) {
  const [root, ...tail] = path;
  if (!root) return undefined;
  const modulePath = bindings.styleImports.get(root);
  if (modulePath) return { modulePath, tokenPath: tail };
  const alias = bindings.aliases.get(root);
  return alias ? { modulePath: alias.modulePath, tokenPath: [...alias.tokenPath, ...tail] } : undefined;
}

function styleSegment(expression: ts.Expression): StyleSegment {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { kind: 'literal', value: expression.text, node: expression };
  }
  const path = dottedPath(expression);
  return path
    ? { kind: 'token', path, node: expression as ts.Identifier | ts.PropertyAccessExpression }
    : { kind: 'opaque', node: expression };
}

function dottedPath(expression: ts.Expression): readonly string[] | undefined {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (!ts.isPropertyAccessExpression(expression)) return undefined;
  const head = dottedPath(expression.expression);
  return head ? [...head, expression.name.text] : undefined;
}

function recordUsage(
  usage: MutableSkinStyleUsage | undefined,
  recipes: readonly SkinStyleRecipe[],
  info: StyleAttributeInfo,
  sourceFile: ts.SourceFile
): void {
  if (!usage) return;
  const location = sourceFile.getLineAndCharacterOfPosition(info.attribute.getStart(sourceFile));
  usage.recordComposition({
    classNames: recipes.map((recipe) => recipe.className),
    origin: {
      description: 'className',
      file: sourceFile.fileName,
      line: location.line + 1,
      column: location.character + 1,
    },
  });
}

function pushClasses(output: string[], value: string): void {
  for (const className of value.split(/\s+/)) {
    if (className) output.push(className);
  }
}
