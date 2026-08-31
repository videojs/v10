import {
  type CallExpression,
  collectIdentifierNames,
  type ImportDeclaration,
  insertModuleImports,
  jsxNamePath,
  type JSXAttribute,
  type JSXOpeningElement,
  type Program,
  type VariableDeclaration,
  type VariableDeclarator,
  walk,
} from '../../../vjsc/src/ast';
import {
  type ComponentTarget,
  type TargetTransform,
  type TargetTransformContext,
  TARGET_ELEMENT,
  type TargetElement,
  type TargetPropsReference,
  type TargetReference,
  type SourceProps,
} from '../../../vjsc/src/target/definition';
import { createTargetModuleImports } from '../../../vjsc/src/target/module-imports';
import { renderTargetElement } from '../../../vjsc/src/target/render';

type MagicString = TargetTransformContext['magicString'];

const RENDER_TARGET_SOURCE = /(?:^|\/)render$/;

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
  readonly element: TargetElement;
  readonly kind: 'component' | 'style';
  readonly name: string;
}

interface RenderTargetTransformOptions {
  readonly target: () => ComponentTarget;
  readonly targets: Readonly<
    Record<string, { readonly element: TargetElement; readonly kind?: 'component' | 'style' | undefined }>
  >;
}

/** Lower Skin-owned shared components and `$render` directives for one framework target. */
export function createRenderTargetTransform(options: RenderTargetTransformOptions): TargetTransform {
  return {
    name: 'videojs:render-targets',
    transform(context) {
      if (!context.code.includes('defineRenderTarget') && !context.code.includes('$render')) return false;

      const target = options.target();
      const definitions = collectDefinitions(context.ast);
      const imports = collectImportedNames(context.ast);
      const canonical = collectCanonicalRoots(context.ast, [target]);
      const runtimeImports = createTargetModuleImports(context.ast, context.magicString);
      const typeImports = new TypeImports(context.ast, context.magicString);
      let changed = false;

      for (const definition of definitions.values()) {
        const resolved = resolveRenderTarget(definition.name, target, options.targets, definition.start);
        const replacement = renderDefinition(definition, resolved, runtimeImports, typeImports);

        context.magicString.overwrite(definition.start, definition.end, replacement);
        changed = true;
      }

      walk(context.ast, {
        enter(node, parent) {
          if (node.type !== 'JSXAttribute' || node.name.type !== 'JSXIdentifier' || node.name.name !== '$render')
            return;

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

          const resolved = resolveRenderTarget(name, target, options.targets, node.start);

          lowerRenderDirective(context.code, parent, node, local, resolved, context.magicString);

          changed = true;
          this.skip();
        },
      });

      if (changed) {
        removeFactoryImports(context.ast, context.magicString);
        runtimeImports.commit();
        typeImports.commit();
      }

      return changed;
    },
  };
}

function removeFactoryImports(ast: Program, magicString: MagicString): void {
  for (const statement of ast.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      !RENDER_TARGET_SOURCE.test(statement.source.value)
    ) {
      continue;
    }

    const factories = statement.specifiers.filter(
      (specifier) => specifier.type === 'ImportSpecifier' && importedName(specifier) === 'defineRenderTarget'
    );
    if (factories.length === 0) continue;

    if (statement.specifiers.length !== factories.length) {
      throw sourceError(
        'defineRenderTarget() must use a dedicated import declaration.\n' +
          'Reason: the compiler removes this build-only import after lowering the shared component.\n' +
          'Recommendation: import defineRenderTarget() separately from other render-target helpers.',
        statement.start
      );
    }

    magicString.remove(statement.start, statement.end);
  }
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

  const name = call.arguments[0];
  const className = call.arguments[1];

  if (name?.type !== 'Literal' || typeof name.value !== 'string') {
    throw sourceError('defineRenderTarget() requires a literal target name.', call.start);
  }

  if (name.value !== declarator.id.name) {
    throw sourceError(
      `Render target export \`${declarator.id.name}\` must match its semantic name \`${name.value}\`.\n` +
        'Reason: named imports carry the render-target identity during isolated transforms.\n' +
        `Recommendation: rename the export or use defineRenderTarget(${JSON.stringify(declarator.id.name)}, ...).`,
      declarator.id.start
    );
  }

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
    name: name.value,
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
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      !RENDER_TARGET_SOURCE.test(statement.source.value)
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      const imported = importedName(specifier);

      if (imported === 'defineRenderTarget') factories.add(specifier.local.name);
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

function resolveRenderTarget(
  name: string,
  target: ComponentTarget,
  targets: RenderTargetTransformOptions['targets'],
  pos: number
): ResolvedRenderTarget {
  const configured = targets[name];

  if (!configured) {
    throw sourceError(
      `The selected Skin target does not define shared component \`${name}\`.\n` +
        'Reason: each `$render` binding requires an explicit React or HTML element contract.\n' +
        `Recommendation: add \`${name}\` to the Skin target's render-target transform.`,
      pos
    );
  }

  return { target, element: configured.element, kind: configured.kind ?? 'style', name };
}

function renderDefinition(
  definition: RenderTargetDefinition,
  resolved: ResolvedRenderTarget,
  runtimeImports: ReturnType<typeof createTargetModuleImports>,
  typeImports: TypeImports
): string {
  const prefix = definition.exported ? 'export ' : '';

  if (resolved.target.jsx.attributes === 'html') {
    return `${prefix}const ${definition.local} = ${JSON.stringify(definition.className)};`;
  }

  const element = renderTargetElement(resolved.element, { target: resolved.target, imports: runtimeImports });
  const props = renderPropsType(resolved.element[TARGET_ELEMENT], typeImports);

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

function renderPropsType(reference: TargetReference, imports: TypeImports): string | undefined {
  if (reference.kind === 'component' || !reference.props) return undefined;

  const props = reference.props;
  const name = imports.reference(props);
  const path = props.path?.length ? `.${props.path.join('.')}` : '';

  return props.intrinsic ? `${name}${path}<${JSON.stringify(props.intrinsic)}>` : `${name}${path}`;
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

  if (resolved.kind === 'component') {
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

export function renderTargetMarker(name: string): string {
  return `data-vjsc-render-${name.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

/** Consume one target-owned render marker from canonical component props. */
export function renderTargetProps<Props extends object>(
  props: SourceProps<Props>,
  name: string
): SourceProps<Props> | undefined {
  const marker = renderTargetMarker(name) as keyof Props & string;

  return props.has(marker) ? (props.omit(marker) as SourceProps<Props>) : undefined;
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

function importedName(specifier: ImportDeclaration['specifiers'][number]): string {
  if (specifier.type !== 'ImportSpecifier') return specifier.local.name;

  return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
}

function sourceError(message: string, pos: number): Error {
  return Object.assign(new Error(message), { pos });
}

class TypeImports {
  readonly #ast: Program;
  readonly #magicString: MagicString;
  readonly #used: Set<string>;
  readonly #existing = new Map<string, string>();
  readonly #requested = new Map<string, Map<string, string>>();

  constructor(ast: Program, magicString: MagicString) {
    this.#ast = ast;
    this.#magicString = magicString;
    this.#used = collectIdentifierNames(ast);

    for (const statement of ast.body) {
      if (statement.type !== 'ImportDeclaration') continue;

      for (const specifier of statement.specifiers) {
        if (specifier.type !== 'ImportSpecifier') continue;

        this.#existing.set(`${statement.source.value}\0${importedName(specifier)}`, specifier.local.name);
      }
    }
  }

  reference(target: TargetPropsReference): string {
    const key = `${target.from}\0${target.name}`;
    let local = this.#existing.get(key);
    if (local) return local;

    let requested = this.#requested.get(target.from);

    if (!requested) {
      requested = new Map();
      this.#requested.set(target.from, requested);
    }

    local = requested.get(target.name);

    if (!local) {
      local = this.#allocate(target.name);
      requested.set(target.name, local);
    }

    return local;
  }

  commit(): void {
    const statements = [...this.#requested].map(([source, imports]) => {
      const specifiers = [...imports].map(([imported, local]) =>
        imported === local ? imported : `${imported} as ${local}`
      );

      return `import type { ${specifiers.join(', ')} } from ${JSON.stringify(source)};`;
    });

    insertModuleImports(this.#ast, this.#magicString, statements);
  }

  #allocate(preferred: string): string {
    if (!this.#used.has(preferred)) {
      this.#used.add(preferred);
      return preferred;
    }

    let suffix = 2;
    let candidate = `${preferred}Type`;

    while (this.#used.has(candidate)) candidate = `${preferred}Type${suffix++}`;

    this.#used.add(candidate);
    return candidate;
  }
}
