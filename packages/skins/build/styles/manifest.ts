import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readAccessPath } from '@videojs/compiler/ast';
import { twMerge } from 'tailwind-merge';
import ts from 'typescript';
import {
  getStyleDefinition,
  isStyleVariants,
  type SkinStyleRole,
  type SkinStyleTree,
  type SkinStyleValue,
  type SkinStyleVariants,
} from '../../canonical/styles/define';
import { resolveSkinClosure } from '../catalog/resolve';
import type { ResolvedSkinCatalog } from '../catalog/types';
import { type ClassNameInfo, type ClassNameSegment, readClassName } from './jsx-class-name';

export interface SkinStyleRecipe {
  modulePath: string;
  tokenPath: readonly string[];
  className: string;
  role: SkinStyleRole;
  utilityGroups: readonly string[];
  utilities: readonly string[];
}

export interface SkinStyleManifest {
  modules: ReadonlyMap<string, ReadonlyMap<string, SkinStyleRecipe>>;
  recipes: readonly SkinStyleRecipe[];
  groupOwners: ReadonlyMap<string, string>;
  peerOwners: ReadonlyMap<string, string>;
}

export interface LoadSkinStyleManifestOptions {
  variant?: string | undefined;
}

/** Load controlled canonical style modules and normalize their explicit definitions. */
export async function loadSkinStyleManifest(
  files: readonly string[],
  options: LoadSkinStyleManifestOptions = {}
): Promise<SkinStyleManifest> {
  const variant = options.variant ?? 'default';
  const moduleFiles = [
    ...new Set(files.filter((file) => file.endsWith('.tailwind.ts')).map((file) => resolve(file))),
  ].sort();
  const modules = new Map<string, ReadonlyMap<string, SkinStyleRecipe>>();
  const recipes: SkinStyleRecipe[] = [];
  const classes = new Map<string, SkinStyleRecipe>();
  const groupOwners = new Map<string, string>();
  const peerOwners = new Map<string, string>();

  for (const inputFile of moduleFiles) {
    const modulePath = await realpath(inputFile);
    const loaded = (await import(pathToFileURL(modulePath).href)) as { default?: unknown };
    const definition = getStyleDefinition(loaded.default);
    if (!definition) {
      throw new Error(`Skin style module \`${inputFile}\` must default-export defineStyles(...).`);
    }

    const moduleRecipes = new Map<string, SkinStyleRecipe>();
    visitStyleTree(definition.styles, [], (tokenPath, value) => {
      const className = semanticClassName(tokenPath);
      const utilityGroups = resolveUtilityGroups(value, variant, inputFile, tokenPath);
      const recipe: SkinStyleRecipe = {
        modulePath,
        tokenPath,
        className,
        role: definition.role,
        utilityGroups,
        utilities: utilityGroups.flatMap((group) => group.split(/\s+/)),
      };
      const previous = classes.get(className);
      if (previous) {
        throw new Error(
          `Skin style class \`${className}\` is defined by both \`${displayRecipe(previous)}\` and \`${displayRecipe(recipe)}\`.`
        );
      }
      classes.set(className, recipe);
      moduleRecipes.set(tokenKey(tokenPath), recipe);
      recipes.push(recipe);
      registerRelationshipMarkers(groupOwners, peerOwners, recipe);
    });
    modules.set(modulePath, moduleRecipes);
  }

  return Object.freeze({
    modules,
    recipes: Object.freeze(recipes),
    groupOwners,
    peerOwners,
  });
}

export function loadCatalogStyleManifest(
  catalog: ResolvedSkinCatalog,
  options: { rootDir: string; itemNames: readonly string[]; variant?: string | undefined }
): Promise<SkinStyleManifest> {
  const files = new Set<string>();
  for (const itemName of options.itemNames) {
    for (const file of resolveSkinClosure(catalog, itemName).styleFiles) {
      files.add(resolve(options.rootDir, file));
    }
  }
  return loadSkinStyleManifest([...files], { variant: options.variant });
}

export function recipeForToken(
  manifest: SkinStyleManifest,
  modulePath: string,
  tokenPath: readonly string[]
): SkinStyleRecipe | undefined {
  return manifest.modules.get(modulePath)?.get(tokenKey(tokenPath));
}

/** Collect the exact semantic recipes referenced by canonical JSX source. */
export async function collectReferencedStyleRecipes(
  files: readonly string[],
  manifest: SkinStyleManifest
): Promise<ReadonlySet<string>> {
  const referenced = new Set<string>();

  for (const file of files.filter((entry) => /\.(?:[cm]?ts|tsx)$/.test(entry))) {
    const sourceText = await readFile(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, scriptKind(file));
    const bindings = styleBindings(sourceFile, manifest);
    if (bindings.size === 0) continue;

    const visit = (node: ts.Node): void => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const info = readClassName(node);
        if (info) collectClassNameRecipes(info, bindings, manifest, referenced);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return referenced;
}

function collectClassNameRecipes(
  info: ClassNameInfo,
  bindings: ReadonlyMap<string, string>,
  manifest: SkinStyleManifest,
  referenced: Set<string>
): void {
  if (info.kind === 'segments') {
    for (const segment of info.segments) collectSegmentRecipe(segment, bindings, manifest, referenced);
    return;
  }
  collectExpressionRecipes(info.expression, bindings, manifest, referenced);
}

function collectExpressionRecipes(
  expression: ts.Expression,
  bindings: ReadonlyMap<string, string>,
  manifest: SkinStyleManifest,
  referenced: Set<string>
): void {
  if (ts.isConditionalExpression(expression)) {
    collectExpressionRecipes(expression.whenTrue, bindings, manifest, referenced);
    collectExpressionRecipes(expression.whenFalse, bindings, manifest, referenced);
    return;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    for (const element of expression.elements) {
      if (!ts.isSpreadElement(element)) collectExpressionRecipes(element, bindings, manifest, referenced);
    }
    return;
  }
  collectSegmentRecipe({ kind: 'opaque', node: expression }, bindings, manifest, referenced);
}

function collectSegmentRecipe(
  segment: ClassNameSegment,
  bindings: ReadonlyMap<string, string>,
  manifest: SkinStyleManifest,
  referenced: Set<string>
): void {
  if (segment.kind === 'literal') return;
  const path = readAccessPath(segment.node);
  const [root, ...tokenPath] = path ?? [];
  const modulePath = root ? bindings.get(root) : undefined;
  const recipe = modulePath ? recipeForToken(manifest, modulePath, tokenPath) : undefined;
  if (recipe) referenced.add(recipe.className);
}

function styleBindings(sourceFile: ts.SourceFile, manifest: SkinStyleManifest): ReadonlyMap<string, string> {
  const bindings = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const importClause = statement.importClause;
    if (!importClause?.name || importClause.namedBindings || !statement.moduleSpecifier.text.startsWith('.')) continue;
    const imported = resolve(dirname(sourceFile.fileName), statement.moduleSpecifier.text);
    for (const modulePath of manifest.modules.keys()) {
      if (modulePath === imported || modulePath === `${imported}.ts`) bindings.set(importClause.name.text, modulePath);
    }
  }
  return bindings;
}

function scriptKind(file: string): ts.ScriptKind {
  return file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
}

function visitStyleTree(
  tree: SkinStyleTree,
  path: readonly string[],
  visit: (path: readonly string[], value: SkinStyleValue | SkinStyleVariants) => void
): void {
  for (const [name, value] of Object.entries(tree)) {
    const tokenPath = [...path, name];
    if (typeof value === 'string' || Array.isArray(value) || isStyleVariants(value)) {
      visit(tokenPath, value as SkinStyleValue | SkinStyleVariants);
    } else {
      visitStyleTree(value as SkinStyleTree, tokenPath, visit);
    }
  }
}

function semanticClassName(path: readonly string[]): string {
  return `media-${path.map(kebabCase).join('-')}`;
}

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function splitUtilityGroups(value: SkinStyleValue): readonly string[] {
  const values = typeof value === 'string' ? [value] : value;
  return values.map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

function resolveUtilityGroups(
  value: SkinStyleValue | SkinStyleVariants,
  variant: string,
  modulePath: string,
  tokenPath: readonly string[]
): readonly string[] {
  if (!isStyleVariants(value)) return splitUtilityGroups(value);
  const selected = value.variants[variant];
  if (selected === undefined) {
    throw new Error(
      `Skin style recipe \`${modulePath}#${tokenPath.join('.')}\` does not define the \`${variant}\` variant.`
    );
  }
  return mergeUtilityGroups([
    ...(value.base === undefined ? [] : splitUtilityGroups(value.base)),
    ...splitUtilityGroups(selected),
  ]);
}

/** Preserve authored groups while removing utilities superseded by the selected variant. */
function mergeUtilityGroups(groups: readonly string[]): readonly string[] {
  const merged = twMerge(groups.join(' ')).split(/\s+/).filter(Boolean);
  const retained = new Map<string, number>();
  for (const utility of merged) retained.set(utility, (retained.get(utility) ?? 0) + 1);

  const output = Array.from({ length: groups.length }, () => [] as string[]);
  const indexedGroups = groups.map((group, index) => ({ index, utilities: group.split(/\s+/).filter(Boolean) }));
  for (const { index, utilities } of indexedGroups.reverse()) {
    const outputGroup = output[index];
    if (!outputGroup) throw new Error('Failed to preserve a Skin style utility group.');
    for (const utility of utilities.reverse()) {
      const remaining = retained.get(utility) ?? 0;
      if (remaining === 0) continue;
      outputGroup.unshift(utility);
      retained.set(utility, remaining - 1);
    }
  }
  return output.map((group) => group.join(' ')).filter(Boolean);
}

function registerRelationshipMarkers(
  groupOwners: Map<string, string>,
  peerOwners: Map<string, string>,
  recipe: SkinStyleRecipe
): void {
  for (const utility of recipe.utilities) {
    if (isPeerMarker(utility)) {
      registerRelationshipOwner(peerOwners, utility, recipe);
      continue;
    }
    if (!isGroupMarker(utility)) continue;
    registerRelationshipOwner(groupOwners, utility, recipe);
  }
}

function registerRelationshipOwner(owners: Map<string, string>, utility: string, recipe: SkinStyleRecipe): void {
  const previous = owners.get(utility);
  if (previous && previous !== recipe.className) {
    throw new Error(
      `Skin relationship marker \`${utility}\` maps to both \`${previous}\` and \`${recipe.className}\`.`
    );
  }
  owners.set(utility, recipe.className);
}

export function isGroupPeerMarker(value: string): boolean {
  return isGroupMarker(value) || isPeerMarker(value);
}

function isGroupMarker(value: string): boolean {
  return value === 'group' || value.startsWith('group/');
}

function isPeerMarker(value: string): boolean {
  return value === 'peer' || value.startsWith('peer/');
}

function tokenKey(path: readonly string[]): string {
  return path.join('.');
}

function displayRecipe(recipe: SkinStyleRecipe): string {
  return `${recipe.modulePath}#${recipe.tokenPath.join('.')}`;
}
