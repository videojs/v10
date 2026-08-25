import type {
  ImportDeclaration,
  JSXElementName,
  JSXOpeningElement,
  Function as OxcFunction,
  Program,
  TSType,
  TSTypeReference,
} from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin, RolldownMagicString } from 'rolldown';

import { createSourceText, jsxNamePath, type ModuleImports, renderSourceRange, type SourceEdit } from '../ast';
import { collectIdentifierNames, insertModuleImports } from '../ast/imports';
import {
  type ComponentTarget,
  type ComponentTargetRule,
  isTargetElement,
  TARGET_ELEMENT,
  type TargetElement,
  type TargetImport,
  type TargetPropsReference,
  type TargetReference,
} from '../target/definition';
import { createTargetModuleImports } from '../target/module-imports';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;
const COMPONENT_SOURCE = 'vjsc/components';

interface CanonicalPath {
  readonly target: ComponentTarget;
  readonly component: string;
  readonly part: string | null;
}

interface CanonicalBindings {
  readonly namespaces: ReadonlyMap<string, ComponentTarget>;
  readonly named: ReadonlyMap<string, CanonicalPath>;
  readonly primitives: ReadonlyMap<string, { readonly name: string; readonly target: ComponentTarget }>;
  readonly sourceTypes: ReadonlyMap<string, string>;
}

interface PropsHelper {
  readonly annotation: TSType;
  readonly reference: TSTypeReference;
  readonly includesChildren: boolean;
  readonly inlineMembers: readonly TSType[];
}

interface ResolvedProps {
  readonly type: string;
  readonly children?: string | undefined;
}

export function targetTypePlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:target-types',
    transform: {
      filter: { id: SCRIPT_ID, code: 'vjsc/components' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const bindings = collectBindings(transform.ast, targets);
        if (bindings.sourceTypes.size === 0) return null;

        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        const typeImports = new TargetTypeImports(transform.ast, transform.magicString);
        let changed = transformSourceTypes(code, transform.ast, bindings, targets, typeImports, transform.magicString);

        walk(transform.ast, {
          enter(node, parent) {
            if (node.type !== 'FunctionDeclaration' || !node.id || !node.body) return;

            const helper = propsHelper(node.params[0]);
            if (!helper) return;

            const forwarded = forwardedBinding(node.params[0]);
            if (!forwarded) return;

            const root = forwardedTarget(node, forwarded, bindings);
            if (!root) return;

            const props = targetProps(root, imports, typeImports);
            if (!props) return;

            const interfaceName = `${node.id.name}Props`;
            const heritage = targetHeritage(props, helper.includesChildren);
            const members = helper.inlineMembers
              .map((type) => rewriteSourceTypeText(code, type, bindings, targets, typeImports))
              .filter(Boolean);

            if (helper.includesChildren && props.children && props.children !== 'children') {
              members.push(`children?: ${props.type}[${JSON.stringify(props.children)}];`);
            }

            const insertion = parent?.type === 'ExportNamedDeclaration' ? parent.start : node.start;

            transform.magicString!.appendLeft(
              insertion,
              `export interface ${interfaceName} extends ${heritage} {${members.length ? `\n${members.join('\n')}\n` : ''}}\n`
            );
            transform.magicString!.overwrite(helper.annotation.start, helper.annotation.end, interfaceName);
            changed = true;
            this.skip();
          },
        });

        if (!changed) return null;

        imports.commit();
        typeImports.commit();
        return { code: transform.magicString };
      },
    },
  };
}

function collectBindings(ast: Program, targets: readonly ComponentTarget[]): CanonicalBindings {
  const bySource = new Map(targets.map((target) => [target.source, target]));

  const namespaces = new Map<string, ComponentTarget>();
  const named = new Map<string, CanonicalPath>();
  const primitives = new Map<string, { name: string; target: ComponentTarget }>();
  const sourceTypes = new Map<string, string>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue;

    const target = bySource.get(statement.source.value);

    if (target && statement.importKind !== 'type') {
      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') namespaces.set(specifier.local.name, target);

        if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
          const component = importedName(specifier);

          named.set(specifier.local.name, { target, component, part: null });
        }
      }
    }

    if (statement.source.value !== COMPONENT_SOURCE) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;

      const name = importedName(specifier);

      if (name === 'Props' || name === 'PropsWithChildren' || name === 'PropsOf' || name.startsWith('Vjsc')) {
        sourceTypes.set(specifier.local.name, name);
      }

      if (specifier.importKind !== 'type' && name !== 'Template') {
        const owners = targets.filter((candidate) => primitiveRule(candidate, name));

        if (owners.length === 1) primitives.set(specifier.local.name, { name, target: owners[0]! });
      }
    }
  }

  return { namespaces, named, primitives, sourceTypes };
}

function transformSourceTypes(
  _code: string,
  ast: Program,
  bindings: CanonicalBindings,
  targets: readonly ComponentTarget[],
  imports: TargetTypeImports,
  magicString: RolldownMagicString
): boolean {
  let changed = false;

  walk(ast, {
    enter(node) {
      if (
        node.type === 'TSInterfaceHeritage' &&
        node.expression.type === 'Identifier' &&
        bindings.sourceTypes.get(node.expression.name) === 'PropsOf'
      ) {
        const query = node.typeArguments?.params[0];
        if (query?.type !== 'TSTypeQuery' || query.exprName.type !== 'Identifier') return;

        const targetType = uniqueTargetType('PropsOf', targets);
        if (!targetType) return;

        const componentProps = imports.reference(targetType);

        magicString.overwrite(node.start, node.end, `${componentProps}<typeof ${query.exprName.name}>`);
        changed = true;
        this.skip();
        return;
      }

      if (node.type !== 'TSTypeReference' || node.typeName.type !== 'Identifier') return;

      const sourceType = bindings.sourceTypes.get(node.typeName.name);
      if (!sourceType) return;

      if (sourceType === 'PropsOf') {
        const query = node.typeArguments?.params[0];
        if (query?.type !== 'TSTypeQuery' || query.exprName.type !== 'Identifier') return;

        const targetType = uniqueTargetType('PropsOf', targets);
        if (!targetType) return;

        const componentProps = imports.reference(targetType);

        magicString.overwrite(node.start, node.end, `${componentProps}<typeof ${query.exprName.name}>`);
        changed = true;
        this.skip();
        return;
      }

      if (sourceType === 'Props' || sourceType === 'PropsWithChildren') return;

      const targetImport = uniqueTargetType(sourceType, targets);
      if (!targetImport) return;

      magicString.overwrite(node.start, node.end, imports.reference(targetImport));
      changed = true;
      this.skip();
    },
  });

  return changed;
}

function uniqueTargetType(name: string, targets: readonly ComponentTarget[]): TargetImport | undefined {
  const references = targets.flatMap((target) => (target.types[name] ? [target.types[name]!] : []));
  if (references.length > 1) throw new Error(`More than one component target defines source type \`${name}\`.`);

  return references[0];
}

function propsHelper(parameter: OxcFunction['params'][number] | undefined): PropsHelper | undefined {
  const pattern = parameter?.type === 'AssignmentPattern' ? parameter.left : parameter;
  const annotation = pattern && 'typeAnnotation' in pattern ? pattern.typeAnnotation?.typeAnnotation : undefined;
  if (!annotation) return undefined;

  const types = annotation.type === 'TSIntersectionType' ? annotation.types : [annotation];

  for (const type of types) {
    if (type.type !== 'TSTypeReference' || type.typeName.type !== 'Identifier') continue;

    if (type.typeName.name !== 'Props' && type.typeName.name !== 'PropsWithChildren') continue;

    return {
      annotation,
      reference: type,
      includesChildren: type.typeName.name === 'PropsWithChildren',
      inlineMembers: [
        ...types.filter((candidate) => candidate.type === 'TSTypeLiteral'),
        ...(type.typeArguments?.params[0]?.type === 'TSTypeLiteral' ? [type.typeArguments.params[0]] : []),
      ],
    };
  }

  return undefined;
}

function rewriteSourceTypeText(
  code: string,
  type: TSType,
  bindings: CanonicalBindings,
  targets: readonly ComponentTarget[],
  imports: TargetTypeImports
): string {
  const edits: SourceEdit[] = [];

  walk(type, {
    enter(node) {
      if (node.type !== 'TSTypeReference' || node.typeName.type !== 'Identifier') return;

      const name = bindings.sourceTypes.get(node.typeName.name);
      if (!name?.startsWith('Vjsc')) return;

      const target = uniqueTargetType(name, targets);
      if (!target) return;

      edits.push({ start: node.typeName.start, end: node.typeName.end, content: imports.reference(target) });
    },
  });

  return renderSourceRange(createSourceText(code, edits), type.start + 1, type.end - 1).value.trim();
}

function forwardedBinding(parameter: OxcFunction['params'][number] | undefined): string | undefined {
  const pattern = parameter?.type === 'AssignmentPattern' ? parameter.left : parameter;
  if (pattern?.type !== 'ObjectPattern') return undefined;

  const rest = pattern.properties.find((property) => property.type === 'RestElement');

  return rest?.type === 'RestElement' && rest.argument.type === 'Identifier' ? rest.argument.name : undefined;
}

function forwardedTarget(
  declaration: OxcFunction,
  binding: string,
  bindings: CanonicalBindings
): { readonly target: ComponentTarget; readonly element: TargetElement } | undefined {
  const matches: Array<{ target: ComponentTarget; element: TargetElement }> = [];

  walk(declaration, {
    enter(node, parent) {
      if (
        node.type !== 'JSXSpreadAttribute' ||
        node.argument.type !== 'Identifier' ||
        node.argument.name !== binding ||
        parent?.type !== 'JSXOpeningElement'
      ) {
        return;
      }

      const resolved = openingTarget(parent, bindings);

      if (resolved) matches.push(resolved);
    },
  });

  const first = matches[0];
  if (!first) return undefined;

  return matches.every((match) => sameTargetElement(first, match)) ? first : undefined;
}

function openingTarget(
  opening: JSXOpeningElement,
  bindings: CanonicalBindings
): { readonly target: ComponentTarget; readonly element: TargetElement } | undefined {
  const path = canonicalPath(opening.name, bindings);

  if (path) {
    const configured = configuredRule(path);
    if (isTargetElement(configured)) return { target: path.target, element: configured };

    const resolved = path.target.resolve({ component: path.component, part: path.part });

    return isTargetElement(resolved) ? { target: path.target, element: resolved } : undefined;
  }

  const names = jsxNamePath(opening.name);
  const primitive = names.length === 1 ? bindings.primitives.get(names[0]!) : undefined;
  if (!primitive) return undefined;

  const rule = primitiveRule(primitive.target, primitive.name);

  return isTargetElement(rule) ? { target: primitive.target, element: rule } : undefined;
}

function targetProps(
  resolved: { readonly target: ComponentTarget; readonly element: TargetElement },
  imports: ModuleImports,
  typeImports: TargetTypeImports
): ResolvedProps | undefined {
  return targetReferenceProps(resolved.element[TARGET_ELEMENT], resolved.target, imports, typeImports, new Set());
}

function targetReferenceProps(
  reference: TargetReference,
  target: ComponentTarget,
  imports: ModuleImports,
  typeImports: TargetTypeImports,
  seen: Set<TargetReference>
): ResolvedProps | undefined {
  if (seen.has(reference)) throw new Error('vjsc/target: component target references form a cycle.');

  seen.add(reference);

  if (reference.kind === 'component') {
    const resolved = target.resolve({ component: reference.component, part: reference.part });

    return isTargetElement(resolved)
      ? targetReferenceProps(resolved[TARGET_ELEMENT], target, imports, typeImports, seen)
      : undefined;
  }

  if (!reference.props) return undefined;

  return {
    type: renderPropsReference(reference, reference.props, imports, typeImports),
    ...(reference.props.children ? { children: reference.props.children } : {}),
  };
}

function renderPropsReference(
  reference: Exclude<TargetReference, { kind: 'component' }>,
  props: TargetPropsReference,
  imports: ModuleImports,
  typeImports: TargetTypeImports
): string {
  let local: string;

  if (reference.kind === 'import' && reference.import.from === props.from && reference.import.name === props.name) {
    local = imports.reference(reference.import);
  } else {
    local = typeImports.reference(props);
  }

  const path = props.path?.length ? `.${props.path.join('.')}` : '';

  return props.intrinsic ? `${local}${path}<${JSON.stringify(props.intrinsic)}>` : `${local}${path}`;
}

function targetHeritage(props: ResolvedProps, includesChildren: boolean): string {
  const omitted = new Set<string>();

  if (!includesChildren) omitted.add('children');

  if (props.children && props.children !== 'children') omitted.add(props.children);

  if (omitted.size === 0) return props.type;

  return `Omit<${props.type}, ${[...omitted].map((name) => JSON.stringify(name)).join(' | ')}>`;
}

function canonicalPath(name: JSXElementName, bindings: CanonicalBindings): CanonicalPath | undefined {
  const path = jsxNamePath(name);
  if (path.length === 0) return undefined;

  const namespace = bindings.namespaces.get(path[0]!);

  if (namespace && path.length > 1) {
    return { target: namespace, component: path[1]!, part: path.length > 2 ? path.slice(2).join('.') : null };
  }

  const named = bindings.named.get(path[0]!);

  return named ? { ...named, part: path.length > 1 ? path.slice(1).join('.') : null } : undefined;
}

function configuredRule(path: CanonicalPath): ComponentTargetRule<object> | undefined {
  let rule = path.target.components[path.component] as ComponentTargetRule<object> | undefined;
  if (!path.part || !rule) return rule;

  const parts = path.part.split('.');

  for (const [index, part] of parts.entries()) {
    if (!rule) return undefined;

    if (typeof rule === 'function' || isTargetElement(rule)) {
      return part === 'Root' && index === parts.length - 1 ? rule : undefined;
    }

    rule = (rule as Readonly<Record<string, ComponentTargetRule<object> | undefined>>)[part];
  }

  return rule;
}

function sameTargetElement(
  left: { readonly target: ComponentTarget; readonly element: TargetElement },
  right: { readonly target: ComponentTarget; readonly element: TargetElement }
): boolean {
  return left.target === right.target && left.element[TARGET_ELEMENT] === right.element[TARGET_ELEMENT];
}

function importedName(specifier: ImportDeclaration['specifiers'][number]): string {
  if (specifier.type !== 'ImportSpecifier') return specifier.local.name;

  return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
}

function primitiveRule(target: ComponentTarget, name: string): unknown {
  return (target.primitives as Readonly<Record<string, unknown>>)[name];
}

class TargetTypeImports {
  readonly #ast: Program;
  readonly #magicString: RolldownMagicString;
  readonly #used: Set<string>;
  readonly #existing = new Map<string, string>();
  readonly #requested = new Map<string, Map<string, string>>();

  constructor(ast: Program, magicString: RolldownMagicString) {
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

  reference(target: TargetImport): string {
    const key = `${target.from}\0${target.name}`;
    let local = this.#existing.get(key);
    if (local) return target.path?.length ? `${local}.${target.path.join('.')}` : local;

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

    return target.path?.length ? `${local}.${target.path.join('.')}` : local;
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
