export const skinStyleDefinition = Symbol.for('@videojs/skins/style-definition');
export const skinStyleVariants = Symbol.for('@videojs/skins/style-variants');

export const skinStyleRoles = [
  'buttons',
  'container',
  'controls',
  'dialog',
  'menus',
  'overlays',
  'popups',
  'poster',
  'sliders',
] as const;

export type SkinStyleRole = (typeof skinStyleRoles)[number];
export type SkinStyleValue = string | readonly string[];
export interface SkinStyleVariants {
  readonly [skinStyleVariants]: true;
  readonly base?: SkinStyleValue | undefined;
  readonly variants: Readonly<Record<string, SkinStyleValue>>;
}
export type SkinStyleTree = {
  readonly [name: string]: SkinStyleValue | SkinStyleVariants | SkinStyleTree;
};

export interface SkinStyleDefinition<Styles extends SkinStyleTree = SkinStyleTree> {
  role: SkinStyleRole;
  styles: Styles;
}

type StyleReferences<Styles extends SkinStyleTree> = {
  readonly [Name in keyof Styles]: Styles[Name] extends SkinStyleVariants
    ? SkinStyleValue
    : Styles[Name] extends SkinStyleTree
      ? StyleReferences<Styles[Name]>
      : Styles[Name];
};

export type DefinedStyles<Styles extends SkinStyleTree> = StyleReferences<Styles> & {
  readonly [skinStyleDefinition]: SkinStyleDefinition<Styles>;
};

/** Define a compile-time style branch while presenting the selected recipe as a class-name value to canonical JSX. */
export function variants<const Variants extends Readonly<Record<string, SkinStyleValue>>>(definition: {
  base?: SkinStyleValue | undefined;
  variants: Variants;
}): SkinStyleVariants {
  return Object.freeze({
    [skinStyleVariants]: true as const,
    ...definition,
    variants: Object.freeze(definition.variants),
  });
}

export function isStyleVariants(value: unknown): value is SkinStyleVariants {
  return Boolean(value && typeof value === 'object' && skinStyleVariants in value);
}

/** Define a semantic style tree while returning the tree itself for ergonomic TSX use. */
export function defineStyles<const Styles extends SkinStyleTree>(
  definition: SkinStyleDefinition<Styles>
): DefinedStyles<Styles> {
  const styles = definition.styles as DefinedStyles<Styles>;
  Object.defineProperty(styles, skinStyleDefinition, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ role: definition.role, styles }),
    writable: false,
  });
  return styles;
}

export function getStyleDefinition(value: unknown): SkinStyleDefinition | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Partial<DefinedStyles<SkinStyleTree>>)[skinStyleDefinition];
}
