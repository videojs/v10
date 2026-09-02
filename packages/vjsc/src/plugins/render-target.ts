import type {
  CallExpression,
  JSXAttribute,
  JSXOpeningElement,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { jsxNamePath, type ModuleImports, sourceError } from '../ast';
import { importedName, isComponentImport } from '../target/bindings';
import type { ComponentTarget, TargetElement, TargetTransformContext } from '../target/definition';
import { createTargetModuleImports, createTargetTypeImports } from '../target/module-imports';
import { renderTargetElement, renderTargetPropsType } from '../target/render';
import { renderTargetMarker } from '../target/render-target';
import { SCRIPT_MODULE_ID } from '../utils/module-id';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

type MagicString = TargetTransformContext['magicString'];

interface RenderTargetDefinition {
  readonly exported: boolean;
  readonly local: string;
  readonly name: string;
  readonly className: string;
  readonly start: number;
  readonly end: number;
}

interface ResolvedRenderTarget {
  readonly target: ComponentTarget;
  /** Absent for component delegates: the canonical host renders the authored component itself. */
  readonly element: TargetElement | undefined;
  readonly name: string;
}

/** Lower `defineRenderTarget` declarations and `$render` directives for the target that owns them. */
export function renderTargetPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:render-target',
    transform: {
      filter: { id: SCRIPT_MODULE_ID, code: /defineRenderTarget|\$render/ },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const owners = targets.filter((target) => Object.keys(target.renderTargets).length > 0);
        if (owners.length > 1) throw new Error('Only one component target per module may define render targets.');

        const changed = lowerRenderTargets(
          { code, id, ast: transform.ast, magicString: transform.magicString },
          owners[0] ?? targets[0]!
        );

        return changed ? { code: transform.magicString } : null;
      },
    },
  };
}

function lowerRenderTargets(context: TargetTransformContext, target: ComponentTarget): boolean {
  const definitions = collectDefinitions(context.ast);
  const imports = collectImportedNames(context.ast);
  const canonical = collectCanonicalRoots(context.ast, [target]);
  const runtimeImports = createTargetModuleImports(context.ast, context.magicString);
  const typeImports = createTargetTypeImports(context.ast, context.magicString);
  let changed = false;

  for (const definition of definitions.values()) {
    const resolved = resolveRenderTarget(definition.name, target, definition.start);
    const replacement = renderDefinition(definition, resolved, runtimeImports, typeImports);

    context.magicString.overwrite(definition.start, definition.end, replacement);
    changed = true;
  }

  walk(context.ast, {
    enter(node, parent) {
      if (node.type !== 'JSXAttribute' || node.name.type !== 'JSXIdentifier' || node.name.name !== '$render') return;

      if (parent?.type !== 'JSXOpeningElement' || !isCanonicalOpening(parent, canonical)) {
        throw sourceError(
          '`$render` can only be used on a canonical component or part.\n' +
            'Reason: framework targets can only compose render props while lowering known component contracts.\n' +
            'Recommendation: move `$render` to the canonical component or part that owns the generated element.',
          node.start
        );
      }

      const local = renderTargetIdentifier(node);
      const name = definitions.get(local)?.name ?? imports.get(local);

      if (!name) {
        throw sourceError(
          `Cannot resolve render target \`${local}\`.\n` +
            'Reason: `$render` must reference a local definition or a named relative import.\n' +
            'Recommendation: pass a directly imported shared component or define it with defineRenderTarget().',
          node.start
        );
      }

      const resolved = resolveRenderTarget(name, target, node.start);

      lowerRenderDirective(context.code, parent, node, local, resolved, context.magicString);

      changed = true;
      this.skip();
    },
  });

  if (changed) {
    runtimeImports.commit();
    typeImports.commit();
  }

  return changed;
}

function collectDefinitions(ast: Program): ReadonlyMap<string, RenderTargetDefinition> {
  const factories = importedFactories(ast);
  const definitions = new Map<string, RenderTargetDefinition>();

  for (const statement of ast.body) {
    const exported = statement.type === 'ExportNamedDeclaration';
    const declaration = exported ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration') continue;

    const definition = readDefinition(declaration, exported, statement.start, statement.end, factories);
    if (!definition) continue;

    if (definitions.has(definition.local)) {
      throw sourceError(`Render target \`${definition.local}\` is defined more than once.`, definition.start);
    }

    definitions.set(definition.local, definition);
  }

  return definitions;
}

function readDefinition(
  declaration: VariableDeclaration,
  exported: boolean,
  start: number,
  end: number,
  factories: ReadonlySet<string>
): RenderTargetDefinition | undefined {
  const matches = declaration.declarations.filter((item) => isDefinitionCall(item.init, factories));
  if (matches.length === 0) return undefined;

  if (declaration.declarations.length !== 1 || matches.length !== 1) {
    throw sourceError('defineRenderTarget() must be the only declarator in its variable statement.', declaration.start);
  }

  const declarator = matches[0]!;

  if (declarator.id.type !== 'Identifier') {
    throw sourceError('defineRenderTarget() must be assigned to a named identifier.', declarator.id.start);
  }

  const call = declarator.init;
  if (!isDefinitionCall(call, factories)) return undefined;

  // The exported identifier is the render target's name: named imports carry it through isolated transforms.
  const className = call.arguments[0];
  const resolvedClassName = readClassName(className);

  if (resolvedClassName === undefined) {
    throw sourceError(
      'defineRenderTarget() requires one statically transformed style reference.\n' +
        'Reason: each framework target needs the selected CSS or Tailwind classes without scanning other modules.\n' +
        'Recommendation: pass one direct style value in an array, for example `[styles.root]`.',
      className?.start ?? call.start
    );
  }

  return {
    exported,
    local: declarator.id.name,
    name: declarator.id.name,
    className: resolvedClassName,
    start,
    end,
  };
}

function readClassName(value: CallExpression['arguments'][number] | undefined): string | undefined {
  if (value?.type === 'Literal' && typeof value.value === 'string') return value.value;

  if (value?.type !== 'ArrayExpression') return undefined;

  const parts = value.elements.map((element) =>
    element?.type === 'Literal' && typeof element.value === 'string' ? element.value : undefined
  );

  return parts.every((part) => part !== undefined) ? parts.join(' ') : undefined;
}

function importedFactories(ast: Program): ReadonlySet<string> {
  const factories = new Set<string>();

  for (const statement of ast.body) {
    if (!isComponentImport(statement)) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      if (importedName(specifier) === 'defineRenderTarget') factories.add(specifier.local.name);
    }
  }

  return factories;
}

function isDefinitionCall(
  expression: VariableDeclarator['init'],
  factories: ReadonlySet<string>
): expression is CallExpression {
  return Boolean(
    expression?.type === 'CallExpression' &&
    expression.callee.type === 'Identifier' &&
    factories.has(expression.callee.name)
  );
}

function collectImportedNames(ast: Program): ReadonlyMap<string, string> {
  const imports = new Map<string, string>();

  for (const statement of ast.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      !statement.source.value.startsWith('.')
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      imports.set(specifier.local.name, importedName(specifier));
    }
  }

  return imports;
}

function collectCanonicalRoots(ast: Program, targets: readonly ComponentTarget[]): ReadonlySet<string> {
  const sources = new Set(targets.map((target) => target.source));
  const roots = new Set<string>();

  for (const statement of ast.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      !sources.has(statement.source.value)
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type') roots.add(specifier.local.name);
    }
  }

  return roots;
}

function isCanonicalOpening(opening: JSXOpeningElement, roots: ReadonlySet<string>): boolean {
  const root = jsxNamePath(opening.name)[0];

  return Boolean(root && roots.has(root));
}

function renderTargetIdentifier(attribute: JSXAttribute): string {
  const expression = attribute.value?.type === 'JSXExpressionContainer' ? attribute.value.expression : undefined;

  if (expression?.type !== 'Identifier') {
    throw sourceError(
      '`$render` requires a direct render-target identifier.\n' +
        'Reason: isolated transforms resolve target identity through static local or named import bindings.\n' +
        'Recommendation: pass the defineRenderTarget() binding directly, for example `$render={Button}`.',
      attribute.start
    );
  }

  return expression.name;
}

function resolveRenderTarget(name: string, target: ComponentTarget, pos: number): ResolvedRenderTarget {
  const configured = target.renderTargets[name];

  if (!configured) {
    throw sourceError(
      `The selected component target does not define render target \`${name}\`.\n` +
        'Reason: each `$render` binding requires an explicit element contract per target.\n' +
        `Recommendation: add \`${name}\` to the target's \`renderTargets\`.`,
      pos
    );
  }

  return { target, element: configured.component ? undefined : configured.element, name };
}

function renderDefinition(
  definition: RenderTargetDefinition,
  resolved: ResolvedRenderTarget,
  runtimeImports: ModuleImports,
  typeImports: ModuleImports
): string {
  const prefix = definition.exported ? 'export ' : '';

  if (!resolved.element) {
    throw sourceError(
      `Render target \`${definition.name}\` is declared with defineRenderTarget() but the target lists it as a component.\n` +
        'Reason: a style host needs an element to carry its classes; only authored components delegate without one.\n' +
        `Recommendation: give \`${definition.name}\` an \`element\` in the target's \`renderTargets\`.`,
      definition.start
    );
  }

  if (resolved.target.jsx.attributes === 'html') {
    return `${prefix}const ${definition.local} = ${JSON.stringify(definition.className)};`;
  }

  const element = renderTargetElement(resolved.element, { target: resolved.target, imports: runtimeImports });
  const props = renderTargetPropsType(resolved.element, typeImports);

  if (!props) {
    throw sourceError(
      `React render target \`${definition.name}\` does not define a props contract.\n` +
        'Reason: generated public components need an exact element props interface.\n' +
        'Recommendation: configure the target element with a props reference.',
      definition.start
    );
  }

  return `${prefix}type ${definition.local}Props = ${props};\n\n${prefix}function ${definition.local}({ className, ...props }: ${definition.local}Props) {\n  return <${element} className={[${JSON.stringify(definition.className)}, className]} {...props} />;\n}`;
}

function lowerRenderDirective(
  code: string,
  opening: JSXOpeningElement,
  directive: JSXAttribute,
  local: string,
  resolved: ResolvedRenderTarget,
  magicString: MagicString
): void {
  if (resolved.target.jsx.attributes === 'react') {
    if (
      opening.attributes.some(
        (attribute) => attribute.type === 'JSXAttribute' && jsxAttributeName(attribute) === 'render'
      )
    ) {
      throw sourceError(
        '`$render` cannot be combined with an authored `render` prop.\n' +
          'Reason: both props select the generated host element.\n' +
          'Recommendation: keep `$render` or the authored render prop, but not both.',
        directive.start
      );
    }

    magicString.overwrite(directive.start, directive.end, `render={<${local} />}`);
    return;
  }

  if (!resolved.element) {
    magicString.overwrite(directive.start, directive.end, renderTargetMarker(resolved.name));
    wrapRenderComponent(code, opening, local, magicString);
    return;
  }

  const className = opening.attributes.find(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' && jsxAttributeName(attribute) === 'className'
  );

  if (!className) {
    magicString.overwrite(directive.start, directive.end, `className={${local}}`);
    return;
  }

  const existing = renderClassNameValue(code, className);

  magicString.remove(attributeWhitespaceStart(code, opening, directive), directive.end);
  magicString.overwrite(className.start, className.end, `className={[${local}, ${existing}]}`);
}

function wrapRenderComponent(code: string, opening: JSXOpeningElement, local: string, magicString: MagicString): void {
  if (!opening.selfClosing) {
    throw sourceError(
      'An HTML component `$render` host must be self-closing.\n' +
        'Reason: the selected component owns the delegated host and its children.\n' +
        'Recommendation: move children into the shared component and use a self-closing `$render` host.',
      opening.start
    );
  }

  const close = code.lastIndexOf('/>', opening.end);
  const name = code.slice(opening.name.start, opening.name.end);

  if (close < opening.name.end) throw sourceError('VJSC could not expand the `$render` host.', opening.start);

  magicString.overwrite(close, opening.end, `><${local} /></${name}>`);
}

function attributeWhitespaceStart(code: string, opening: JSXOpeningElement, attribute: JSXAttribute): number {
  let start = attribute.start;

  while (start > opening.name.end && /\s/.test(code[start - 1]!)) start -= 1;

  return start;
}

function renderClassNameValue(code: string, attribute: JSXAttribute): string {
  if (!attribute.value) return 'true';

  if (attribute.value.type === 'Literal') return JSON.stringify(attribute.value.value);

  if (attribute.value.type !== 'JSXExpressionContainer' || attribute.value.expression.type === 'JSXEmptyExpression') {
    throw sourceError('VJSC cannot merge `$render` with this className value.', attribute.start);
  }

  return code.slice(attribute.value.expression.start, attribute.value.expression.end);
}

function jsxAttributeName(attribute: JSXAttribute): string | undefined {
  return attribute.name.type === 'JSXIdentifier' ? attribute.name.name : undefined;
}
