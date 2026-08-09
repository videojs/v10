import type { SkinStyleComposition } from './transform';

export interface SkinCssRecipeOrigin {
  description: string;
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
}

export interface SkinCssRecipe {
  className: string;
  candidates: readonly string[];
  origin: SkinCssRecipeOrigin;
}

export interface SkinCssRole {
  name?: string | undefined;
  recipes: readonly SkinCssRecipe[];
  groupPeerBindings: ReadonlyMap<string, string>;
}

export interface SkinStyleSheet {
  roles: readonly SkinCssRole[];
  candidates: readonly string[];
  compositions: readonly SkinStyleComposition[];
}
