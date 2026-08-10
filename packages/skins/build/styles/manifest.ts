import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getStyleDefinition,
  type SkinStyleRole,
  type SkinStyleTree,
  type SkinStyleValue,
} from '../../canonical/styles/define';
import { resolveSkinClosure } from '../catalog/resolve';
import type { ResolvedSkinCatalog } from '../catalog/types';

export interface SkinStyleRecipe {
  modulePath: string;
  tokenPath: readonly string[];
  className: string;
  role: SkinStyleRole;
  utilities: readonly string[];
}

export interface SkinStyleManifest {
  modules: ReadonlyMap<string, ReadonlyMap<string, SkinStyleRecipe>>;
  recipes: readonly SkinStyleRecipe[];
  groupOwners: ReadonlyMap<string, string>;
  peerMarkers: ReadonlySet<string>;
}

/** Load controlled canonical style modules and normalize their explicit definitions. */
export async function loadSkinStyleManifest(files: readonly string[]): Promise<SkinStyleManifest> {
  const moduleFiles = [
    ...new Set(files.filter((file) => file.endsWith('.tailwind.ts')).map((file) => resolve(file))),
  ].sort();
  const modules = new Map<string, ReadonlyMap<string, SkinStyleRecipe>>();
  const recipes: SkinStyleRecipe[] = [];
  const classes = new Map<string, SkinStyleRecipe>();
  const groupOwners = new Map<string, string>();
  const peerMarkers = new Set<string>();

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
      const recipe: SkinStyleRecipe = {
        modulePath,
        tokenPath,
        className,
        role: definition.role,
        utilities: splitUtilities(value),
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
      registerRelationshipMarkers(groupOwners, peerMarkers, recipe);
    });
    modules.set(modulePath, moduleRecipes);
  }

  return Object.freeze({
    modules,
    recipes: Object.freeze(recipes),
    groupOwners,
    peerMarkers,
  });
}

export function loadCatalogStyleManifest(
  catalog: ResolvedSkinCatalog,
  options: { rootDir: string; itemNames: readonly string[] }
): Promise<SkinStyleManifest> {
  const files = new Set<string>();
  for (const itemName of options.itemNames) {
    for (const file of resolveSkinClosure(catalog, itemName).styleFiles) {
      files.add(resolve(options.rootDir, file));
    }
  }
  return loadSkinStyleManifest([...files]);
}

export function recipeForToken(
  manifest: SkinStyleManifest,
  modulePath: string,
  tokenPath: readonly string[]
): SkinStyleRecipe | undefined {
  return manifest.modules.get(modulePath)?.get(tokenKey(tokenPath));
}

function visitStyleTree(
  tree: SkinStyleTree,
  path: readonly string[],
  visit: (path: readonly string[], value: SkinStyleValue) => void
): void {
  for (const [name, value] of Object.entries(tree)) {
    const tokenPath = [...path, name];
    if (typeof value === 'string' || Array.isArray(value)) {
      visit(tokenPath, value as SkinStyleValue);
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

function splitUtilities(value: SkinStyleValue): readonly string[] {
  const values = typeof value === 'string' ? [value] : value;
  return values.flatMap((part) => part.split(/\s+/)).filter(Boolean);
}

function registerRelationshipMarkers(
  groupOwners: Map<string, string>,
  peerMarkers: Set<string>,
  recipe: SkinStyleRecipe
): void {
  for (const utility of recipe.utilities) {
    if (isPeerMarker(utility)) {
      peerMarkers.add(utility);
      continue;
    }
    if (!isGroupMarker(utility)) continue;
    const previous = groupOwners.get(utility);
    if (previous && previous !== recipe.className) {
      throw new Error(
        `Skin relationship marker \`${utility}\` maps to both \`${previous}\` and \`${recipe.className}\`.`
      );
    }
    groupOwners.set(utility, recipe.className);
  }
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
