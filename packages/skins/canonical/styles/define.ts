export const skinStyleDefinition = Symbol.for('@videojs/skins/style-definition');

export const skinStyleRoles = ['buttons', 'container', 'controls', 'overlays', 'popups', 'poster', 'sliders'] as const;

export type SkinStyleRole = (typeof skinStyleRoles)[number];
export type SkinStyleValue = string | readonly string[];
export type SkinStyleTree = {
  readonly [name: string]: SkinStyleValue | SkinStyleTree;
};

export interface SkinStyleDefinition<Styles extends SkinStyleTree = SkinStyleTree> {
  role: SkinStyleRole;
  styles: Styles;
}

export type DefinedStyles<Styles extends SkinStyleTree> = Styles & {
  readonly [skinStyleDefinition]: SkinStyleDefinition<Styles>;
};

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
