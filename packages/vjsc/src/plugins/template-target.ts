import type { ImportDeclaration, JSXElement, JSXOpeningElement, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { findJsxAttribute, type ModuleImports } from '../ast';
import {
  type ComponentTarget,
  isTargetElement,
  type PrimitiveTargetRule,
  type SourceProps,
  TARGET_HOST,
  type TargetNode,
  type TargetOutput,
  type TemplateTargetDefinition,
  type TemplateTargetRule,
} from '../target/definition';
import { jsx } from '../target/jsx-runtime';
import { createTargetModuleImports } from '../target/module-imports';
import { isTargetNode, renderTargetAttributes, renderTargetOutput } from '../target/render';
import {
  createSourceChildren,
  createSourceProps,
  type SourceChildrenToken,
  singleJsxElementChild,
} from '../target/source';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

interface TemplateBinding {
  readonly local: string;
  readonly targets: readonly ComponentTarget[];
}

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly code: string;
}

export function templateTargetPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:template-target',
    transform: {
      filter: { id: SCRIPT_ID, code: 'Template' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const binding = collectTemplateBinding(transform.ast, targets);
        if (!binding) return null;

        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        let changed = false;
        let occurrence = 0;

        walk(transform.ast, {
          enter(node) {
            if (node.type !== 'JSXElement') return;

            const templates = node.children.filter(
              (child): child is JSXElement => child.type === 'JSXElement' && isTemplate(child, binding.local)
            );
            if (templates.length === 0) return;

            for (const template of templates) {
              const name = staticName(template, code);
              const owned = binding.targets.flatMap((target) => {
                const rule = target.primitives.Template?.[name];

                return rule ? [{ target, rule }] : [];
              });

              if (owned.length === 0) {
                throw new Error(`Component target does not define <Template name=${JSON.stringify(name)}>.`);
              }

              if (owned.length > 1) {
                throw new Error(`More than one component target defines <Template name=${JSON.stringify(name)}>.`);
              }

              const owner = owned[0]!;
              const definition = normalizeTemplateRule(owner.rule);
              const children = templateChildren(code, template, binding.local, definition, owner.target, imports);
              const props = createSourceProps<Record<string, unknown>>(code, template.openingElement, children).omit(
                'name'
              );
              const output = applyRule(
                definition.render,
                props,
                children as unknown as TargetOutput,
                `vjsc-template-${occurrence}`
              );

              if (isHostOutput(output)) {
                const attributes = renderTargetAttributes(output, { target: owner.target, imports });

                assertAvailableHostAttributes(node.openingElement, attributes, code);

                if (attributes.length > 0) {
                  transform.magicString!.appendLeft(
                    openingInsertion(node.openingElement, code),
                    ` ${attributes.join(' ')}`
                  );
                }

                transform.magicString!.remove(template.start, template.end);
              } else {
                transform.magicString!.overwrite(
                  template.start,
                  template.end,
                  renderTargetOutput(output, { target: owner.target, imports })
                );
              }

              changed = true;
              occurrence += 1;
            }

            this.skip();
          },
        });

        if (!changed) return null;

        imports.commit();
        return { code: transform.magicString };
      },
    },
  };
}

function collectTemplateBinding(ast: Program, targets: readonly ComponentTarget[]): TemplateBinding | undefined {
  for (const statement of ast.body) {
    if (!isComponentImport(statement)) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
      if (imported === 'Template') return { local: specifier.local.name, targets };
    }
  }

  return undefined;
}

function isComponentImport(statement: Program['body'][number]): statement is ImportDeclaration {
  return (
    statement.type === 'ImportDeclaration' &&
    statement.importKind !== 'type' &&
    statement.source.value === 'vjsc/components'
  );
}

function normalizeTemplateRule(rule: TemplateTargetRule): TemplateTargetDefinition {
  if (!isTargetElement(rule) && typeof rule === 'object' && rule !== null && 'render' in rule) return rule;

  return { render: rule };
}

function templateChildren(
  code: string,
  template: JSXElement,
  local: string,
  definition: TemplateTargetDefinition,
  target: ComponentTarget,
  imports: ModuleImports
): SourceChildrenToken {
  const root = singleJsxElementChild(template);
  const closingStart = template.closingElement?.start ?? template.openingElement.end;
  const children = createSourceChildren(code, template.openingElement, closingStart, root?.openingElement);
  const replacements: Replacement[] = [];

  walk(template, {
    enter(node) {
      if (node === template || node.type !== 'JSXElement' || !isTemplatePart(node, local)) return;

      const name = staticName(node, code);
      const rule = definition.parts?.[name];
      if (!rule) throw new Error(`Template target does not define <Template.Part name=${JSON.stringify(name)}>.`);

      const partChildren = createSourceChildren(
        code,
        node.openingElement,
        node.closingElement?.start ?? node.openingElement.end
      );
      const props = createSourceProps<Record<string, unknown>>(code, node.openingElement, partChildren).omit('name');
      const output = applyRule(rule, props, partChildren as unknown as TargetOutput, `vjsc-template-part-${name}`);

      replacements.push({
        start: node.start - template.openingElement.end,
        end: node.end - template.openingElement.end,
        code: renderTargetOutput(output, { target, imports }),
      });
      this.skip();
    },
  });

  return { ...children, value: applyReplacements(children.value, replacements) };
}

function applyRule(
  rule: PrimitiveTargetRule<object>,
  props: SourceProps<object>,
  children: TargetOutput,
  id: string
): TargetOutput {
  if (typeof rule === 'function' && !isTargetElement(rule)) {
    return rule({ props, children, id: (name) => `${id}-${name}` });
  }

  if (isTargetElement(rule)) return jsx(rule, { ...props, children });

  throw new Error('Template target rules must be target elements or rewrite functions.');
}

function applyReplacements(source: string, replacements: readonly Replacement[]): string {
  let output = source;

  for (const replacement of [...replacements].sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.code}${output.slice(replacement.end)}`;
  }

  return output;
}

function isTemplate(node: JSXElement, local: string): boolean {
  return node.openingElement.name.type === 'JSXIdentifier' && node.openingElement.name.name === local;
}

function isTemplatePart(node: JSXElement, local: string): boolean {
  const name = node.openingElement.name;

  return (
    name.type === 'JSXMemberExpression' &&
    name.object.type === 'JSXIdentifier' &&
    name.object.name === local &&
    name.property.name === 'Part'
  );
}

function staticName(node: JSXElement, code: string): string {
  const value = findJsxAttribute(node, 'name')?.value;
  if (value?.type === 'Literal' && typeof value.value === 'string') return value.value;

  if (value?.type === 'JSXExpressionContainer') {
    const expression = value.expression;
    if (expression.type === 'Literal' && typeof expression.value === 'string') return expression.value;
  }

  throw new Error(
    `<Template> and <Template.Part> require a static string name in ${code.slice(node.start, node.end)}.`
  );
}

function isHostOutput(output: TargetOutput): output is TargetNode {
  return isTargetNode(output) && output.type === TARGET_HOST;
}

function openingInsertion(opening: JSXOpeningElement, code: string): number {
  return opening.end - (code[opening.end - 2] === '/' ? 2 : 1);
}

function assertAvailableHostAttributes(opening: JSXOpeningElement, attributes: readonly string[], code: string): void {
  const declared = new Set(
    opening.attributes.flatMap((attribute) =>
      attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' ? [attribute.name.name] : []
    )
  );

  for (const attribute of attributes) {
    const name = /^([:$\w-]+)/.exec(attribute)?.[1];

    if (name && declared.has(name)) {
      throw new Error(
        `Template parent already declares ${JSON.stringify(name)} in ${code.slice(opening.start, opening.end)}.`
      );
    }
  }
}
