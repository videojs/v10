import { DiagnosticError } from '@videojs/compiler';
import { type Declaration, transform } from 'lightningcss';
import { visitCssRules } from './css-ast';
import type { SkinCssRecipe, SkinCssRole, SkinStyleSheet } from './stylesheet';

interface RecipeDeclaration {
  property: string;
  domains: readonly string[];
  signature: string;
}

interface RecipeEntry {
  role: SkinCssRole;
  recipe: SkinCssRecipe;
}

const encoder = new TextEncoder();

/** Ensure co-applied semantic classes compose without depending on stylesheet order. */
export function validateStyleCompositions(
  stylesheet: SkinStyleSheet,
  cssForRecipe: (role: SkinCssRole, recipe: SkinCssRecipe) => string
): void {
  const recipes = new Map<string, RecipeEntry>();
  for (const role of stylesheet.roles) {
    for (const recipe of role.recipes) recipes.set(recipe.className, { role, recipe });
  }

  const declarations = new Map<string, readonly RecipeDeclaration[]>();
  const declarationList = (entry: RecipeEntry): readonly RecipeDeclaration[] => {
    const cached = declarations.get(entry.recipe.className);
    if (cached) return cached;
    const collected = collectRecipeDeclarations(cssForRecipe(entry.role, entry.recipe));
    declarations.set(entry.recipe.className, collected);
    return collected;
  };

  for (const composition of stylesheet.compositions) {
    const entries = composition.classNames.flatMap((className) => {
      const entry = recipes.get(className);
      return entry ? [entry] : [];
    });
    for (let firstIndex = 0; firstIndex < entries.length; firstIndex++) {
      for (let nextIndex = firstIndex + 1; nextIndex < entries.length; nextIndex++) {
        const first = entries[firstIndex]!;
        const next = entries[nextIndex]!;
        const conflict = conflictingDeclaration(declarationList(first), declarationList(next));
        if (!conflict) continue;
        throw new DiagnosticError(
          `style emission: co-applied semantic classes '${first.recipe.className}' and '${next.recipe.className}' both declare '${conflict.property}'.\n` +
            `  first (${first.recipe.origin.description}): ${first.recipe.candidates.join(' ')}\n` +
            `  next (${next.recipe.origin.description}): ${next.recipe.candidates.join(' ')}\n` +
            `Stacked semantic classes must add disjoint styles. Move the override into one token recipe.`,
          { ...composition.origin, diagnosticCode: 'style-composition-conflict' }
        );
      }
    }
  }
}

function collectRecipeDeclarations(css: string): RecipeDeclaration[] {
  const declarations: RecipeDeclaration[] = [];
  transform({
    filename: 'semantic-recipe.css',
    code: encoder.encode(css),
    visitor: {
      StyleSheet(stylesheet) {
        visitCssRules(stylesheet.rules, (rule) => {
          const block =
            rule.type === 'style'
              ? rule.value.declarations
              : rule.type === 'nesting'
                ? rule.value.style.declarations
                : null;
          if (!block) return;
          for (const declaration of block.declarations ?? []) declarations.push(recipeDeclaration(declaration, false));
          for (const declaration of block.importantDeclarations ?? [])
            declarations.push(recipeDeclaration(declaration, true));
        });
      },
    },
  });
  return declarations;
}

function recipeDeclaration(declaration: Declaration, important: boolean): RecipeDeclaration {
  const property = declarationProperty(declaration);
  return {
    property,
    domains: declarationDomains(property),
    signature: `${important ? 'important' : 'normal'}:${JSON.stringify(declaration)}`,
  };
}

function declarationProperty(declaration: Declaration): string {
  if (declaration.property === 'custom') return declaration.value.name;
  if (declaration.property === 'unparsed') return declaration.value.propertyId.property;
  return declaration.property;
}

function conflictingDeclaration(
  first: readonly RecipeDeclaration[],
  next: readonly RecipeDeclaration[]
): RecipeDeclaration | undefined {
  for (const firstDeclaration of first) {
    for (const nextDeclaration of next) {
      if (!domainsOverlap(firstDeclaration.domains, nextDeclaration.domains)) continue;
      if (firstDeclaration.signature === nextDeclaration.signature) continue;
      return firstDeclaration;
    }
  }
  return undefined;
}

function domainsOverlap(first: readonly string[], next: readonly string[]): boolean {
  return first.includes('*') || next.includes('*') || first.some((domain) => next.includes(domain));
}

function declarationDomains(property: string): readonly string[] {
  return SHORTHAND_DOMAINS[property] ?? [property];
}

const SHORTHAND_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  all: ['*'],
  background: [
    'background-color',
    'background-image',
    'background-position',
    'background-size',
    'background-repeat',
    'background-origin',
    'background-clip',
    'background-attachment',
  ],
  border: [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ],
  'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'border-style': ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'],
  'border-color': ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
  'border-radius': [
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
  ],
  font: ['font-family', 'font-size', 'font-style', 'font-weight', 'font-stretch', 'font-variant', 'line-height'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'margin-block': ['margin-block-start', 'margin-block-end'],
  'margin-inline': ['margin-inline-start', 'margin-inline-end'],
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'padding-block': ['padding-block-start', 'padding-block-end'],
  'padding-inline': ['padding-inline-start', 'padding-inline-end'],
  inset: ['top', 'right', 'bottom', 'left'],
  'inset-block': ['inset-block-start', 'inset-block-end'],
  'inset-inline': ['inset-inline-start', 'inset-inline-end'],
  overflow: ['overflow-x', 'overflow-y'],
  gap: ['row-gap', 'column-gap'],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  'place-content': ['align-content', 'justify-content'],
  'place-items': ['align-items', 'justify-items'],
  'place-self': ['align-self', 'justify-self'],
  columns: ['column-width', 'column-count'],
  'column-rule': ['column-rule-width', 'column-rule-style', 'column-rule-color'],
  'list-style': ['list-style-position', 'list-style-image', 'list-style-type'],
  outline: ['outline-width', 'outline-style', 'outline-color'],
  'text-decoration': [
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-color',
    'text-decoration-thickness',
  ],
  transition: [
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    'transition-delay',
    'transition-behavior',
  ],
  animation: [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
    'animation-direction',
    'animation-fill-mode',
    'animation-play-state',
    'animation-timeline',
  ],
};
