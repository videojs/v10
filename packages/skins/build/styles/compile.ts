import { type SkinStyleRole, skinStyleRoles } from '../../canonical/styles/define';
import type { DesignSystem } from './design-system';
import { emitSkinRoleCss } from './emitter';
import { isGroupPeerMarker, type SkinStyleManifest, type SkinStyleRecipe } from './manifest';
import type { SkinCssRecipe, SkinCssRole } from './stylesheet';

/** Compile referenced semantic recipes once and return reviewable CSS grouped by explicit role. */
export async function compileSkinStyles(options: {
  design: DesignSystem;
  manifest: SkinStyleManifest;
  scopeClass: string;
}): Promise<Map<SkinStyleRole, string>> {
  const peerMarkers = [...options.manifest.peerMarkers];
  if (peerMarkers.length > 0) {
    throw new Error(`Vanilla Skin styles do not support peer relationships: ${peerMarkers.join(', ')}.`);
  }
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
  }

  const roles: SkinCssRole[] = skinStyleRoles.flatMap((role) => {
    const recipes = byRole.get(role);
    return recipes?.length ? [{ name: role, recipes, groupOwners: options.manifest.groupOwners }] : [];
  });
  const emitted = await emitSkinRoleCss({
    design: options.design,
    scopeClass: options.scopeClass,
    roles,
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
  };
}

export { type DesignSystem, loadDesignSystem } from './design-system';
