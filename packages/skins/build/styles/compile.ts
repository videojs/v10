import { type SkinStyleRole, skinStyleRoles } from '../../canonical/styles/define';
import type { DesignSystem } from './design-system';
import { emitSkinRoleCss } from './emitter';
import { isGroupPeerMarker, type SkinStyleManifest, type SkinStyleRecipe } from './manifest';
import type { SkinCssRecipe, SkinCssRole, SkinStyleSheet } from './stylesheet';
import type { SkinStyleUsage } from './transform';

/** Compile referenced semantic recipes once and return reviewable CSS grouped by explicit role. */
export async function compileSkinStyles(options: {
  design: DesignSystem;
  manifest: SkinStyleManifest;
  usage: SkinStyleUsage;
}): Promise<Map<SkinStyleRole, string>> {
  const candidates: string[] = [];
  const candidateSet = new Set<string>();
  const byRole = new Map<SkinStyleRole, SkinCssRecipe[]>();

  for (const recipe of [...options.manifest.recipes].sort((a, b) => a.className.localeCompare(b.className))) {
    const compiled = compileRecipe(recipe, options.design);
    if (compiled.candidates.length === 0) continue;
    let recipes = byRole.get(recipe.role);
    if (!recipes) {
      recipes = [];
      byRole.set(recipe.role, recipes);
    }
    recipes.push(compiled);
    for (const candidate of compiled.candidates) {
      if (candidateSet.has(candidate)) continue;
      candidateSet.add(candidate);
      candidates.push(candidate);
    }
  }

  const roles: SkinCssRole[] = skinStyleRoles.flatMap((role) => {
    const recipes = byRole.get(role);
    return recipes?.length ? [{ name: role, recipes, groupPeerBindings: options.manifest.groupPeerBindings }] : [];
  });
  const stylesheet: SkinStyleSheet = {
    roles,
    candidates: candidates.sort(),
    compositions: options.usage.compositions,
  };
  const emitted = await emitSkinRoleCss({
    design: options.design,
    stylesheet,
  });

  return new Map(skinStyleRoles.map((role) => [role, emitted.get(role) ?? '']));
}

function compileRecipe(recipe: SkinStyleRecipe, design: DesignSystem): SkinCssRecipe {
  const candidates: string[] = [];
  const unsupported: string[] = [];
  for (const utility of recipe.utilities) {
    if (isGroupPeerMarker(utility)) continue;
    if (design.recognizesCandidate(utility)) candidates.push(utility);
    else unsupported.push(utility);
  }
  if (unsupported.length > 0) {
    throw new Error(
      `Skin style \`${recipe.tokenPath.join('.')}\` contains unsupported utilities: ${unsupported.join(' ')}. ` +
        'Keep literal public classes in TSX instead of semantic style definitions.'
    );
  }
  return {
    className: recipe.className,
    candidates,
    origin: {
      description: recipe.tokenPath.join('.'),
      file: recipe.modulePath,
    },
  };
}

export { type DesignSystem, loadDesignSystem } from './design-system';
