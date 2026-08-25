import { isObject } from '@videojs/utils/predicate';

import { isStyleRule, visitStyleRules } from './tree';

const styleDefinition = Symbol.for('vjsc/styles/definition');

export type StyleValue = string | readonly string[];

export interface StyleRule {
  /** The stable semantic class emitted for CSS output. */
  readonly className: string;
  /** Also match this class when it is colocated on the configured CSS scope root. */
  readonly scopeRoot?: boolean | undefined;
  /** Tailwind utilities shared by every configured variant. */
  readonly utilities: StyleValue;
  /** Utilities appended when a source transform selects a matching variant. */
  readonly variants?: Readonly<Record<string, StyleValue>> | undefined;
}

export type StyleTree = {
  readonly [name: string]: StyleRule | StyleTree;
};

export interface StyleDefinition<Rules extends StyleTree = StyleTree> {
  /** CSS asset path used when the style transform emits CSS. */
  readonly file: string;
  /** Cascade layer containing the emitted rules. */
  readonly layer: string;
  readonly description?: string | undefined;
  readonly rules: Rules;
}

export type StyleReferences<Rules extends StyleTree> = {
  readonly [Name in keyof Rules]: Rules[Name] extends StyleRule
    ? string
    : Rules[Name] extends StyleTree
      ? StyleReferences<Rules[Name]>
      : never;
};

type DefinedStyles<Rules extends StyleTree> = StyleReferences<Rules> & {
  readonly [styleDefinition]: StyleDefinition<Rules>;
};

/** Define statically transformable styles while exposing semantic class references to consumers. */
export function styles<const Rules extends StyleTree>(definition: StyleDefinition<Rules>): StyleReferences<Rules> {
  validateStyleDefinition(definition);

  const references =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ createReferences(
      definition.rules
    ) as DefinedStyles<Rules>;

  Object.defineProperty(references, styleDefinition, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ ...definition }),
    writable: false,
  });

  return freezeReferences(references);
}

export function getStyleDefinition<Value>(value: Value): StyleDefinition | undefined {
  if (!value || !isObject(value)) return undefined;
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
    value as Partial<DefinedStyles<StyleTree>>
  )[styleDefinition];
}

export { isStyleRule };

function createReferences(tree: StyleTree) {
  const references: Record<string, import('../value').VjscValue> = {};

  for (const [name, value] of Object.entries(tree)) {
    references[name] = isStyleRule(value) ? value.className : createReferences(value);
  }

  return references satisfies Record<string, import('../value').VjscValue>;
}

function freezeReferences<Rules extends StyleTree>(references: DefinedStyles<Rules>): DefinedStyles<Rules> {
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ freezeReferenceValue(
    references
  ) as DefinedStyles<Rules>;
}

function freezeReferenceValue<Value extends object>(value: Value): Value {
  for (const child of Object.values(value)) {
    if (child && isObject(child)) freezeReferenceValue(child);
  }

  return Object.freeze(value);
}

export function validateStyleDefinition(definition: StyleDefinition): void {
  const fileSegments = definition.file.split('/');

  if (
    !definition.file.endsWith('.css') ||
    definition.file.startsWith('/') ||
    definition.file.includes('\\') ||
    fileSegments.includes('..')
  ) {
    throw new Error(`Style output file \`${definition.file}\` must be a relative CSS asset path.`);
  }

  if (!/^[-_a-zA-Z][-_a-zA-Z0-9]*(?:\.[-_a-zA-Z][-_a-zA-Z0-9]*)*$/.test(definition.layer)) {
    throw new Error(`Style layer \`${definition.layer}\` must be a CSS layer name.`);
  }

  visitStyleRules(definition.rules, (path, rule) => {
    if (!/^[_a-zA-Z][-_a-zA-Z0-9]*$/.test(rule.className)) {
      throw new Error(`Style rule \`${path.join('.')}\` must declare one unprefixed CSS class name.`);
    }
  });
}
