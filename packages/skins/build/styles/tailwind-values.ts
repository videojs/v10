import { DiagnosticError } from '@videojs/compiler';
import {
  type Declaration,
  type DeclarationBlock,
  Features,
  type Rule,
  type TokenOrValue,
  transform,
} from 'lightningcss';
import { cloneCssAst, hasNestedCssRules, visitCssRules, withoutNullValues } from './css-ast';
import { foldGroupDescendantSelectors } from './selectors';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function collectTailwindDefaults(rules: readonly Rule[]): Map<string, readonly TokenOrValue[]> {
  const defaults = new Map<string, readonly TokenOrValue[]>();
  visitCssRules(rules, (rule) => {
    if (rule.type !== 'property' || !rule.value.name.startsWith('--tw-')) return;
    const initial = rule.value.initialValue;
    if (initial?.type === 'token-list') defaults.set(rule.value.name, cloneCssAst(initial.value));
  });
  return defaults;
}

function collectTailwindSetters(rules: readonly Rule[]): Set<string> {
  const setters = new Set<string>();
  visitCssRules(rules, (rule) => {
    const block =
      rule.type === 'style' ? rule.value.declarations : rule.type === 'nesting' ? rule.value.style.declarations : null;
    if (!block) return;
    for (const declaration of [...(block.declarations ?? []), ...(block.importantDeclarations ?? [])]) {
      if (declaration.property === 'custom' && declaration.value.name.startsWith('--tw-')) {
        setters.add(declaration.value.name);
      }
    }
  });
  return setters;
}

export function inlinePrivateTailwindVariables(
  css: string,
  defaults: ReadonlyMap<string, readonly TokenOrValue[]>
): string {
  if (!css) return '';
  const result = transform({
    filename: 'emitted.css',
    code: encoder.encode(css),
    include: Features.Nesting,
    visitor: {
      StyleSheet(stylesheet) {
        const setters = collectTailwindSetters(stylesheet.rules);
        return withoutNullValues({
          ...cloneCssAst(stylesheet),
          rules: inlineTailwindRules(stylesheet.rules, defaults, setters),
          licenseComments: [],
        });
      },
    },
  });
  const output = decoder.decode(result.code).trim();
  assertNoPrivateTailwindVariables(output);
  return output;
}

export function optimizeSemanticCss(css: string): string {
  if (!css) return '';
  return decoder
    .decode(
      transform({
        filename: 'emitted.css',
        code: encoder.encode(css),
        visitor: {
          Rule: {
            style(rule) {
              const clone = cloneCssAst(rule);
              removeExactDuplicateDeclarations(clone.value.declarations);
              return withoutNullValues(clone);
            },
          },
        },
      }).code
    )
    .trim();
}

function removeExactDuplicateDeclarations(block: DeclarationBlock): void {
  if (block.declarations) block.declarations = keepLastExactDeclaration(block.declarations);
  if (block.importantDeclarations) block.importantDeclarations = keepLastExactDeclaration(block.importantDeclarations);
}

function keepLastExactDeclaration(declarations: Declaration[]): Declaration[] {
  const seen = new Set<string>();
  const output: Declaration[] = [];
  for (let index = declarations.length - 1; index >= 0; index--) {
    const declaration = declarations[index]!;
    const key = JSON.stringify(declaration);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(declaration);
  }
  return output.reverse();
}

function inlineTailwindRules(
  rules: readonly Rule[],
  defaults: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): Rule[] {
  const output: Rule[] = [];
  for (const source of rules) {
    if (source.type === 'property' && source.value.name.startsWith('--tw-')) continue;
    if (
      source.type === 'layer-statement' &&
      source.value.names.every((name) => name.length === 1 && name[0] === 'properties')
    ) {
      continue;
    }
    const rule = cloneCssAst(source);

    if (rule.type === 'style') {
      rule.value.selectors = foldGroupDescendantSelectors(rule.value.selectors);
      inlineTailwindDeclarationBlock(rule.value.declarations, defaults, setters);
      if (rule.value.rules) rule.value.rules = inlineTailwindRules(rule.value.rules, defaults, setters);
      if (isEmptyStyleRule(rule.value.declarations, rule.value.rules)) continue;
    } else if (rule.type === 'nesting') {
      rule.value.style.selectors = foldGroupDescendantSelectors(rule.value.style.selectors);
      inlineTailwindDeclarationBlock(rule.value.style.declarations, defaults, setters);
      if (rule.value.style.rules)
        rule.value.style.rules = inlineTailwindRules(rule.value.style.rules, defaults, setters);
      if (isEmptyStyleRule(rule.value.style.declarations, rule.value.style.rules)) continue;
    } else if (hasNestedCssRules(rule)) {
      rule.value.rules = inlineTailwindRules(rule.value.rules, defaults, setters);
      if (rule.value.rules.length === 0) continue;
    }

    output.push(rule);
  }
  return output;
}

function inlineTailwindDeclarationBlock(
  block: DeclarationBlock | undefined,
  defaults: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): void {
  if (!block) return;
  const environment = new Map<string, readonly TokenOrValue[]>(defaults);
  for (const declaration of [...(block.declarations ?? []), ...(block.importantDeclarations ?? [])]) {
    if (declaration.property === 'custom' && declaration.value.name.startsWith('--tw-')) {
      environment.set(declaration.value.name, declaration.value.value);
    }
  }
  block.declarations = inlineTailwindDeclarations(block.declarations ?? [], environment, setters);
  block.importantDeclarations = inlineTailwindDeclarations(block.importantDeclarations ?? [], environment, setters);
}

function inlineTailwindDeclarations(
  declarations: readonly Declaration[],
  environment: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>
): Declaration[] {
  const output: Declaration[] = [];
  for (const source of declarations) {
    if (source.property === 'custom' && source.value.name.startsWith('--tw-')) continue;
    const declaration = cloneCssAst(source);
    if (declaration.property === 'custom' || declaration.property === 'unparsed') {
      declaration.value.value = resolveTailwindTokens(declaration.value.value, environment, setters, []);
    } else if (JSON.stringify(declaration).includes('--tw-')) {
      throw new DiagnosticError(
        `style emission: cannot inline Tailwind variables in parsed declaration '${declaration.property}'.`,
        { diagnosticCode: 'style-tailwind-variable-unsupported' }
      );
    }
    output.push(declaration);
  }
  return output;
}

function resolveTailwindTokens(
  tokens: readonly TokenOrValue[],
  environment: ReadonlyMap<string, readonly TokenOrValue[]>,
  setters: ReadonlySet<string>,
  stack: readonly string[]
): TokenOrValue[] {
  const output: TokenOrValue[] = [];
  for (const source of tokens) {
    const token = cloneCssAst(source);
    if (token.type === 'var') {
      const name = token.value.name.ident;
      if (name.startsWith('--tw-')) {
        if (stack.includes(name)) {
          throw new DiagnosticError(`style emission: Tailwind variable cycle: ${[...stack, name].join(' -> ')}.`, {
            diagnosticCode: 'style-tailwind-variable-cycle',
          });
        }
        const local = environment.get(name);
        if (!local && setters.has(name)) {
          throw new DiagnosticError(
            `style emission: Tailwind variable '${name}' is set by another rule and cannot be safely inlined.`,
            { diagnosticCode: 'style-tailwind-variable-cross-rule' }
          );
        }
        const replacement = local ?? token.value.fallback;
        if (replacement == null) {
          throw new DiagnosticError(`style emission: cannot resolve Tailwind variable '${name}'.`, {
            diagnosticCode: 'style-tailwind-variable-unresolved',
          });
        }
        output.push(...resolveTailwindTokens(replacement, environment, setters, [...stack, name]));
        continue;
      }
      if (token.value.fallback) {
        token.value.fallback = resolveTailwindTokens(token.value.fallback, environment, setters, stack);
      }
    } else if (token.type === 'function') {
      token.value.arguments = resolveTailwindTokens(token.value.arguments, environment, setters, stack);
    }
    output.push(foldSimpleCalc(token));
  }
  return normalizeTokenWhitespace(output);
}

function foldSimpleCalc(token: TokenOrValue): TokenOrValue {
  if (token.type !== 'function' || token.value.name !== 'calc') return token;
  const arguments_ = token.value.arguments.filter((argument) => !isWhitespaceToken(argument));
  if (arguments_.length === 0 || arguments_.length % 2 === 0) return token;

  let scalar = 1;
  let dimension: TokenOrValue | undefined;
  for (let index = 0; index < arguments_.length; index += 2) {
    const value = arguments_[index]!;
    const operator = index === 0 ? '*' : calcOperator(arguments_[index - 1]);
    if (!operator) return token;

    if (value.type === 'token' && value.value.type === 'number') {
      if (operator === '/' && value.value.value === 0) return token;
      scalar = operator === '*' ? scalar * value.value.value : scalar / value.value.value;
      continue;
    }
    if (operator === '/' || dimension || !isNumericDimension(value)) return token;
    dimension = cloneCssAst(value);
  }

  if (!dimension) return { type: 'token', value: { type: 'number', value: scalar } };
  scaleNumericDimension(dimension, scalar);
  return dimension;
}

function calcOperator(token: TokenOrValue | undefined): '*' | '/' | undefined {
  if (token?.type !== 'token' || token.value.type !== 'delim') return;
  return token.value.value === '*' || token.value.value === '/' ? token.value.value : undefined;
}

function isNumericDimension(token: TokenOrValue): boolean {
  return (
    token.type === 'length' ||
    token.type === 'angle' ||
    token.type === 'time' ||
    token.type === 'resolution' ||
    (token.type === 'token' && (token.value.type === 'percentage' || token.value.type === 'dimension'))
  );
}

function scaleNumericDimension(token: TokenOrValue, scalar: number): void {
  if (token.type === 'length' || token.type === 'angle' || token.type === 'time' || token.type === 'resolution') {
    token.value.value *= scalar;
  } else if (token.type === 'token' && (token.value.type === 'percentage' || token.value.type === 'dimension')) {
    token.value.value *= scalar;
  }
}

function normalizeTokenWhitespace(tokens: readonly TokenOrValue[]): TokenOrValue[] {
  const output: TokenOrValue[] = [];
  for (const token of tokens) {
    if (isWhitespaceToken(token) && (output.length === 0 || isWhitespaceToken(output.at(-1)))) continue;
    output.push(token);
  }
  if (isWhitespaceToken(output.at(-1))) output.pop();
  return output;
}

function isWhitespaceToken(token: TokenOrValue | undefined): boolean {
  return token?.type === 'token' && token.value.type === 'white-space';
}

function assertNoPrivateTailwindVariables(css: string): void {
  if (!css.includes('--tw-')) return;
  const names = new Set<string>();
  transform({
    filename: 'emitted.css',
    code: encoder.encode(css),
    visitor: {
      Variable(variable) {
        if (variable.name.ident.startsWith('--tw-')) names.add(variable.name.ident);
      },
      Declaration: {
        custom(declaration) {
          if (declaration.name.startsWith('--tw-')) names.add(declaration.name);
        },
      },
      Rule: {
        property(rule) {
          if (rule.value.name.startsWith('--tw-')) names.add(rule.value.name);
        },
      },
    },
  });
  if (names.size === 0) return;
  throw new DiagnosticError(
    `style emission: Tailwind variables leaked into inline output: ${[...names].sort().join(', ')}.`,
    { diagnosticCode: 'style-tailwind-variable-leak' }
  );
}

function isEmptyStyleRule(block: DeclarationBlock | undefined, rules: readonly Rule[] | undefined): boolean {
  return (
    (block?.declarations?.length ?? 0) === 0 &&
    (block?.importantDeclarations?.length ?? 0) === 0 &&
    (rules?.length ?? 0) === 0
  );
}
