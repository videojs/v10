import { type Declaration, Features, type Rule, type SupportsCondition, type Targets, transform } from 'lightningcss';

import { cloneCssAst, withoutNullValues } from './css-ast';

const encoder = new TextEncoder();

const decoder = new TextDecoder();

export interface LowerStylesOptions {
  /** Browsers the stylesheet must render in, from `browserslistToTargets()`. */
  readonly targets: Targets;
}

/**
 * Features Lightning CSS would rewrite for every browser rather than only the old ones: `:dir()` becomes a `:lang()`
 * list, and `light-dark()` depends on `color-scheme` declarations the stylesheet does not own. The skin source keeps
 * `:dir()` beside `[dir]` selectors and guards `light-dark()` behind `@supports` with its own fallback.
 */
export const PRESERVED_FEATURES = Features.DirSelector | Features.LightDark;

/**
 * Lower a stylesheet so it renders in `targets`: flatten nesting and add the vendor prefixes they need. Color features
 * Lightning CSS cannot lower, such as `contrast-color()` or relative colors from a variable, carry fallbacks in the
 * skin source instead.
 */
export function lowerStyles(css: string, options: LowerStylesOptions): string {
  const lowered = decoder.decode(
    transform({
      filename: 'lowered.css',
      code: encoder.encode(css),
      targets: options.targets,
      exclude: PRESERVED_FEATURES,
    }).code
  );

  // Serializing without targets would drop the vendor prefixes the first pass added.
  return decoder.decode(
    transform({
      filename: 'guarded.css',
      code: encoder.encode(lowered),
      targets: options.targets,
      exclude: PRESERVED_FEATURES,
      visitor: {
        StyleSheet(stylesheet) {
          return withoutNullValues({ ...cloneCssAst(stylesheet), rules: withCurrentColorMixGuards(stylesheet.rules) });
        },
      },
    }).code
  );
}

function withCurrentColorMixGuards(rules: readonly Rule[]): Rule[] {
  return rules.flatMap((rule): Rule[] => {
    if (rule.type === 'style') return guardCurrentColorMix(rule);

    const value = (rule as { value?: { rules?: Rule[] } }).value;

    if (value && Array.isArray(value.rules)) value.rules = withCurrentColorMixGuards(value.rules);

    return [rule];
  });
}

/**
 * WebKit 16 crashes the page on `color: color-mix(…currentcolor…)`, where `currentcolor` refers to the inherited color.
 * Tailwind emits it for utilities such as `text-current/65`, so the source cannot avoid it. Move such declarations
 * behind `contain-intrinsic-size: auto`, which WebKit shipped in Safari 17 and every other target already supports, so
 * Safari 16 keeps the rule's other declarations and any unmixed fallback before it.
 */
function guardCurrentColorMix(rule: Extract<Rule, { type: 'style' }>): Rule[] {
  const declarations = rule.value.declarations?.declarations ?? [];
  const crashing = declarations.filter(isCurrentColorMix);
  if (crashing.length === 0) return [rule];

  const guarded: Rule = {
    type: 'supports',
    value: {
      loc: cloneCssAst(rule.value.loc),
      condition: {
        type: 'declaration',
        propertyId: { property: 'contain-intrinsic-size' } as Extract<
          SupportsCondition,
          { type: 'declaration' }
        >['propertyId'],
        value: 'auto 1px',
      },
      rules: [
        {
          ...cloneCssAst(rule),
          value: { ...cloneCssAst(rule.value), declarations: { declarations: crashing, importantDeclarations: [] } },
        },
      ],
    },
  };
  const rest = declarations.filter((declaration) => !isCurrentColorMix(declaration));
  const kept = rest.length > 0 || (rule.value.declarations?.importantDeclarations ?? []).length > 0;

  return kept
    ? [{ ...rule, value: { ...rule.value, declarations: { ...rule.value.declarations, declarations: rest } } }, guarded]
    : [guarded];
}

function isCurrentColorMix(declaration: Declaration): boolean {
  if (declaration.property !== 'unparsed' || declaration.value.propertyId.property !== 'color') return false;

  const text = JSON.stringify(declaration.value.value).toLowerCase();

  return text.includes('"name":"color-mix"') && text.includes('{"type":"ident","value":"currentcolor"}');
}
