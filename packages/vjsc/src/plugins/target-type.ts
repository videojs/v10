import type {
  JSXOpeningElement,
  Function as OxcFunction,
  Program,
  TSInterfaceDeclaration,
  TSType,
  TSTypeQuery,
  TSTypeReference,
} from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin, RolldownMagicString } from 'rolldown';

import { createSourceText, jsxNamePath, type ModuleImports, renderSourceRange, type SourceEdit } from '../ast';
import { collectIdentifierNames, insertModuleImports } from '../ast/imports';
import {
  boundCanonicalPath,
  type CanonicalBindings,
  canonicalPath,
  collectCanonicalBindings,
  collectPrimitiveBindings,
  COMPONENT_SOURCE,
  configuredRule,
  importedName,
  primitiveRule,
} from '../target/bindings';
import {
  type ComponentTarget,
  isTargetElement,
  TARGET_ELEMENT,
  type TargetElement,
  type TargetImport,
  type TargetPropsReference,
  type TargetReference,
} from '../target/definition';
import { createTargetModuleImports } from '../target/module-imports';
import { SCRIPT_MODULE_ID } from '../utils/module-id';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

interface PropsHelper {
  readonly annotation: TSType;
  readonly reference: TSTypeReference;
  readonly includesChildren: boolean;
  readonly inlineMembers: readonly TSType[];
  readonly sourceInterface?: SourcePropsInterface | undefined;
}

interface SourcePropsInterface {
  readonly declaration: TSInterfaceDeclaration;
  readonly exported: boolean;
}

interface ResolvedProps {
  readonly type: string;
  readonly children?: string | undefined;
}

export function targetTypePlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:target-types',
    transform: {
      filter: { id: SCRIPT_MODULE_ID, code: 'vjsc/components' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const bindings = collectBindings(transform.ast, targets);
        if (bindings.sourceTypes.size === 0) return null;

        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        const typeImports = new TargetTypeImports(transform.ast, transform.magicString);
        const sourceInterfaces = collectSourceInterfaces(transform.ast);
        let changed = transformSourceTypes(
          code,
          transform.ast,
          bindings,
          targets,
          imports,
          typeImports,
          transform.magicString
        );

        walk(transform.ast, {
          enter(node, parent) {
            if (node.type !== 'FunctionDeclaration' || !node.id || !node.body) return;

            const helper = propsHelper(node.params[0], sourceInterfaces);
            if (!helper) return;

            const forwarded = forwardedBinding(node.params[0]);
            if (!forwarded) return;

            const root = forwardedTarget(node, forwarded, bindings);
            if (!root) return;

            const props = targetProps(root, imports, typeImports);
            if (!props) return;

            const interfaceName = helper.sourceInterface?.declaration.id.name ?? `${node.id.name}Props`;
            const heritage = targetHeritage(props, helper.includesChildren);
            const members = helper.inlineMembers
              .map((type) => rewriteSourceTypeText(code, type, bindings, targets, imports, typeImports))
              .filter(Boolean);

            if (helper.includesChildren && props.children && props.children !== 'children') {
              members.push(`children?: ${props.type}[${JSON.stringify(props.children)}];`);
            }

            if (helper.sourceInterface) {
              const source = helper.sourceInterface;

              if (!source.exported) transform.magicString!.appendLeft(source.declaration.start, 'export ');

              transform.magicString!.overwrite(
                source.declaration.id.end,
                source.declaration.body.start,
                ` extends ${heritage} `
              );

              if (members.length > 0) {
                transform.magicString!.appendLeft(source.declaration.body.end - 1, `\n${members.join('\n')}\n`);
              }
            } else {
              const insertion = parent?.type === 'ExportNamedDeclaration' ? parent.start : node.start;
              const declaration = members.length
                ? `export interface ${interfaceName} extends ${heritage} {\n${members.join('\n')}\n}\n\n`
                : `export type ${interfaceName} = ${heritage};\n\n`;

              transform.magicString!.appendLeft(insertion, declaration);
            }

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

interface TypeBindings extends CanonicalBindings {
  readonly primitives: ReadonlyMap<string, { readonly name: string; readonly target: ComponentTarget }>;
  readonly sourceTypes: ReadonlyMap<string, string>;
}

function collectBindings(ast: Program, targets: readonly ComponentTarget[]): TypeBindings {
  const sourceTypes = new Map<string, string>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== COMPONENT_SOURCE) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;

      const name = importedName(specifier);

      if (
        name === 'ClassNameValue' ||
        name === 'Props' ||
        name === 'PropsWithChildren' ||
        name === 'PropsOf' ||
        name.startsWith('Vjsc')
      ) {
        sourceTypes.set(specifier.local.name, name);
      }
    }
  }

  return { ...collectCanonicalBindings(ast, targets), primitives: collectPrimitiveBindings(ast, targets), sourceTypes };
}

function transformSourceTypes(
  _code: string,
  ast: Program,
  bindings: TypeBindings,
  targets: readonly ComponentTarget[],
  imports: ModuleImports,
  typeImports: TargetTypeImports,
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
        const props = propsOfType(query, bindings, targets, imports, typeImports);
        if (!props) return;

        magicString.overwrite(node.start, node.end, props);
        changed = true;
        this.skip();
        return;
      }

      if (node.type !== 'TSTypeReference' || node.typeName.type !== 'Identifier') return;

      const sourceType = bindings.sourceTypes.get(node.typeName.name);
      if (!sourceType) return;

      if (sourceType === 'PropsOf') {
        const query = node.typeArguments?.params[0];
        const props = propsOfType(query, bindings, targets, imports, typeImports);
        if (!props) return;

        magicString.overwrite(node.start, node.end, props);
        changed = true;
        this.skip();
        return;
      }

      if (sourceType === 'Props' || sourceType === 'PropsWithChildren') return;

      const targetImport = uniqueTargetType(sourceType, targets);
      if (!targetImport) return;

      magicString.overwrite(node.start, node.end, typeImports.reference(targetImport));
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

function propsHelper(
  parameter: OxcFunction['params'][number] | undefined,
  sourceInterfaces: ReadonlyMap<string, SourcePropsInterface>
): PropsHelper | undefined {
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
        ...inlineTypeMembers(type.typeArguments?.params[0]),
      ],
      sourceInterface: sourcePropsInterface(type.typeArguments?.params[0], sourceInterfaces),
    };
  }

  return undefined;
}

function collectSourceInterfaces(ast: Program): ReadonlyMap<string, SourcePropsInterface> {
  const interfaces = new Map<string, SourcePropsInterface>();

  for (const statement of ast.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'TSInterfaceDeclaration') continue;

    interfaces.set(declaration.id.name, {
      declaration,
      exported: statement.type === 'ExportNamedDeclaration',
    });
  }

  return interfaces;
}

function sourcePropsInterface(
  type: TSType | undefined,
  interfaces: ReadonlyMap<string, SourcePropsInterface>
): SourcePropsInterface | undefined {
  return type?.type === 'TSTypeReference' && type.typeName.type === 'Identifier'
    ? interfaces.get(type.typeName.name)
    : undefined;
}

function inlineTypeMembers(type: TSType | undefined): TSType[] {
  if (!type) return [];

  if (type.type === 'TSTypeLiteral') return [type];

  if (type.type === 'TSIntersectionType') return type.types.flatMap(inlineTypeMembers);

  return [];
}

function rewriteSourceTypeText(
  code: string,
  type: TSType,
  bindings: TypeBindings,
  targets: readonly ComponentTarget[],
  imports: ModuleImports,
  typeImports: TargetTypeImports
): string {
  const edits: SourceEdit[] = [];

  walk(type, {
    enter(node) {
      if (node.type !== 'TSTypeReference' || node.typeName.type !== 'Identifier') return;

      const name = bindings.sourceTypes.get(node.typeName.name);

      if (name === 'PropsOf') {
        const query = node.typeArguments?.params[0];
        const props = propsOfType(query, bindings, targets, imports, typeImports);
        if (!props) return;

        edits.push({
          start: node.start,
          end: node.end,
          content: props,
        });
        this.skip();
        return;
      }

      if (name !== 'ClassNameValue' && !name?.startsWith('Vjsc')) return;

      const target = uniqueTargetType(name, targets);
      if (!target) return;

      edits.push({ start: node.typeName.start, end: node.typeName.end, content: typeImports.reference(target) });
    },
  });

  return renderSourceRange(createSourceText(code, edits), type.start + 1, type.end - 1).value.trim();
}

function propsOfType(
  type: TSType | undefined,
  bindings: TypeBindings,
  targets: readonly ComponentTarget[],
  imports: ModuleImports,
  typeImports: TargetTypeImports
): string | undefined {
  if (type?.type !== 'TSTypeQuery') return undefined;

  const path = typeQueryPath(type.exprName);
  const canonical = boundCanonicalPath(path, bindings);

  if (canonical) {
    const configured = configuredRule(canonical);
    const rule = isTargetElement(configured) ? configured : canonical.target.components.resolve(canonical);
    if (!isTargetElement(rule)) return undefined;

    return targetProps({ target: canonical.target, element: rule }, imports, typeImports)?.type;
  }

  if (path.length !== 1) return undefined;

  const target = uniqueTargetType('PropsOf', targets);
  if (!target) return undefined;

  const componentProps = typeImports.reference(target);

  return `NonNullable<${componentProps}<typeof ${path[0]}>>`;
}

function typeQueryPath(name: TSTypeQuery['exprName']): string[] {
  if (name.type === 'Identifier') return [name.name];

  if (name.type !== 'TSQualifiedName') return [];

  return [...typeQueryPath(name.left), name.right.name];
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
  bindings: TypeBindings
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
  bindings: TypeBindings
): { readonly target: ComponentTarget; readonly element: TargetElement } | undefined {
  const path = canonicalPath(opening.name, bindings);

  if (path) {
    const configured = configuredRule(path);
    if (isTargetElement(configured)) return { target: path.target, element: configured };

    const resolved = path.target.components.resolve({ component: path.component, part: path.part });

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
    const resolved = target.components.resolve({ component: reference.component, part: reference.part });

    return isTargetElement(resolved)
      ? targetReferenceProps(resolved[TARGET_ELEMENT], target, imports, typeImports, seen)
      : undefined;
  }

  if (!reference.props) return undefined;

  const type = renderPropsReference(reference, reference.props, imports, typeImports);

  return reference.props.children ? { type, children: reference.props.children } : { type };
}

function renderPropsReference(
  reference: Exclude<TargetReference, { kind: 'component' }>,
  props: TargetPropsReference,
  imports: ModuleImports,
  typeImports: TargetTypeImports
): string {
  let local: string;

  if (reference.kind === 'import' && reference.import.from === props.from && reference.import.name === props.name) {
    // Component values and their public props commonly live on sibling paths
    // of the same namespace (`Menu.Root` and `Menu.RootProps`). Import the
    // namespace root once instead of appending the props path to the value path.
    local = imports.reference({ from: reference.import.from, name: reference.import.name });
  } else {
    local = typeImports.reference(props);
  }

  const path = props.path?.length ? `.${props.path.join('.')}` : '';

  return props.intrinsic ? `${local}${path}<${JSON.stringify(props.intrinsic)}>` : `${local}${path}`;
}

function targetHeritage(props: ResolvedProps, includesChildren: boolean): string {
  const omitted = new Set<string>();

  if (!includesChildren || (props.children && props.children !== 'children')) omitted.add('children');

  if (props.children && props.children !== 'children') omitted.add(props.children);

  if (omitted.size === 0) return props.type;

  return `Omit<${props.type}, ${[...omitted].map((name) => JSON.stringify(name)).join(' | ')}>`;
}

function sameTargetElement(
  left: { readonly target: ComponentTarget; readonly element: TargetElement },
  right: { readonly target: ComponentTarget; readonly element: TargetElement }
): boolean {
  return left.target === right.target && left.element[TARGET_ELEMENT] === right.element[TARGET_ELEMENT];
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
