export interface SkinCssRecipe {
  className: string;
  candidates: readonly string[];
}

export interface SkinCssRole {
  name: string;
  recipes: readonly SkinCssRecipe[];
  groupOwners: ReadonlyMap<string, string>;
}
