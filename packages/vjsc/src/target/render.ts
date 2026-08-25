import { type ModuleImports, sliceSource } from '../ast';
import { htmlAttributeName } from './attributes';
import {
  type ComponentTarget,
  type ComponentTargetPath,
  isTargetElement,
  TARGET_ELEMENT,
  TARGET_FRAGMENT,
  TARGET_HOST,
  TARGET_NODE,
  TARGET_SPREAD,
  type TargetElement,
  type TargetExpressionNode,
  type TargetNode,
  type TargetOutput,
  type TargetReference,
} from './definition';
import { isTargetExpression, isTargetWithProps, readTargetExpression } from './expression';
import {
  isSourceChildrenToken,
  isSourcePropsToken,
  isSourcePropToken,
  SOURCE_PROPS,
  type SourceChildrenToken,
  type SourcePropsToken,
  type SourcePropToken,
} from './source';

export interface TargetRenderContext {
  readonly target: ComponentTarget;
  readonly imports: ModuleImports;
}

export function renderTargetElement(element: TargetElement, context: TargetRenderContext): string {
  return renderTargetReference(element[TARGET_ELEMENT], context, new Set());
}

export function renderTargetOutput(output: TargetOutput, context: TargetRenderContext): string {
  if (output === null || output === undefined || output === false) return '';

  if (Array.isArray(output)) {
    const children = output.map((item) => renderTargetOutput(item, context)).join('');

    return children ? `<>${children}</>` : '';
  }

  if (isSourceChildrenToken(output)) return output.value;

  if (isSourcePropToken(output)) return renderSourcePropValue(output);

  if (isTargetExpression(output)) return `{${renderTargetExpression(readTargetExpression(output), context)}}`;

  if (isTargetWithProps(output)) return renderWithProps(output.children, output.props, context);

  if (isTargetNode(output)) return renderTargetNode(output, context);

  if (typeof output === 'string' || typeof output === 'number' || typeof output === 'boolean') {
    return `{${JSON.stringify(output)}}`;
  }

  throw new Error('vjsc/target: a component rewrite returned an unsupported output value.');
}

function renderTargetNode(node: TargetNode, context: TargetRenderContext): string {
  if (node.type === TARGET_FRAGMENT) return `<>${renderChildren(node.props.children, context)}</>`;

  if (node.type === TARGET_HOST) return renderWithProps(node.props.children as TargetOutput, node.props, context);

  if (!isTargetElement(node.type)) throw new Error('vjsc/target: target JSX contains an invalid element type.');

  const name = renderTargetElement(node.type, context);
  const attributes = renderTargetAttributes(node, context);

  const opening = `<${name}${attributes.length ? ` ${attributes.join(' ')}` : ''}`;
  const children = renderChildren(node.props.children, context);

  return children ? `${opening}>${children}</${name}>` : `${opening} />`;
}

export function renderTargetAttributes(node: TargetNode, context: TargetRenderContext): string[] {
  const attributes: string[] = [];
  const props = node.props as Readonly<Record<PropertyKey, unknown>>;

  if (node.key !== null) attributes.push(renderGeneratedAttribute('key', node.key, context));

  for (const property of Reflect.ownKeys(node.props)) {
    if (property === 'children') continue;

    const value = props[property];

    if (property === SOURCE_PROPS) {
      if (isSourcePropsToken(value)) attributes.push(...renderSourceProps(value, context.target.jsx.attributes));

      continue;
    }

    if (property === TARGET_SPREAD) {
      if (isTargetExpression(value)) {
        attributes.push(`{...${renderTargetExpression(readTargetExpression(value), context)}}`);
      }

      continue;
    }

    if (typeof property !== 'string' || value === undefined) continue;

    const attribute = renderAttribute(property, value, context);

    if (attribute) attributes.push(attribute);
  }

  return attributes;
}

function renderChildren(value: unknown, context: TargetRenderContext): string {
  if (isSourceChildrenToken(value)) return value.value;

  if (isSourcePropToken(value)) return renderSourcePropValue(value);

  if (isTargetExpression(value)) return `{${renderTargetExpression(readTargetExpression(value), context)}}`;

  if (isTargetWithProps(value)) return renderWithProps(value.children, value.props, context);

  if (isTargetNode(value)) return renderTargetNode(value, context);

  if (Array.isArray(value)) return value.map((child) => renderChildren(child, context)).join('');

  if (value === null || value === undefined || value === false) return '';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `{${JSON.stringify(value)}}`;
  }

  throw new Error('vjsc/target: target JSX contains an unsupported child value.');
}

function renderAttribute(name: string, value: unknown, context: TargetRenderContext): string | undefined {
  const targetName = targetAttributeName(name, context.target.jsx.attributes);

  if (isSourcePropToken(value)) return renderSourcePropAttribute(targetName, value);

  if (isSourceChildrenToken(value)) return `${targetName}=${renderChildrenAttribute(value)}`;

  if (isTargetExpression(value)) {
    return `${targetName}={${renderTargetExpression(readTargetExpression(value), context)}}`;
  }

  return renderGeneratedAttribute(targetName, value, context);
}

function renderGeneratedAttribute(name: string, value: unknown, context: TargetRenderContext): string {
  if (value === true) return name;

  if (isTargetExpression(value)) {
    return `${name}={${renderTargetExpression(readTargetExpression(value), context)}}`;
  }

  if (isTargetWithProps(value)) return `${name}={${renderWithProps(value.children, value.props, context)}}`;

  if (isTargetNode(value)) return `${name}={${renderTargetNode(value, context)}}`;

  if (Array.isArray(value)) return `${name}={<>${renderChildren(value, context)}</>}`;

  if (value === null) return `${name}={null}`;

  if (typeof value === 'string') return `${name}=${JSON.stringify(value)}`;

  if (typeof value === 'number' || typeof value === 'boolean') return `${name}={${String(value)}}`;

  throw new Error(`vjsc/target: target JSX prop \`${name}\` contains an unsupported value.`);
}

function renderSourceProps(token: SourcePropsToken, attributes: ComponentTarget['jsx']['attributes']): string[] {
  return token.attributes.flatMap((attribute) => {
    if (attribute.type === 'JSXSpreadAttribute') return [sliceSource(token.source, attribute.start, attribute.end)];

    if (attribute.name.type !== 'JSXIdentifier' || token.omitted.has(attribute.name.name)) return [];

    const name = targetAttributeName(attribute.name.name, attributes);
    if (name === attribute.name.name) return [sliceSource(token.source, attribute.start, attribute.end)];

    if (!attribute.value) return [name];

    return [`${name}=${sliceSource(token.source, attribute.value.start, attribute.value.end)}`];
  });
}

function renderSourcePropAttribute(name: string, token: SourcePropToken): string | undefined {
  const attribute = token.attribute;
  if (!attribute) return undefined;

  if (!attribute.value) return name;

  return `${name}=${sliceSource(token.source, attribute.value.start, attribute.value.end)}`;
}

function renderSourcePropValue(token: SourcePropToken): string {
  const attribute = token.attribute;
  if (!attribute) return '{undefined}';

  if (!attribute.value) return '{true}';

  if (attribute.value.type === 'JSXExpressionContainer') {
    return sliceSource(token.source, attribute.value.start, attribute.value.end);
  }

  return `{${sliceSource(token.source, attribute.value.start, attribute.value.end)}}`;
}

function renderChildrenAttribute(token: SourceChildrenToken): string {
  const value = token.value.trim();
  if (!value) return '{null}';

  if (value.startsWith('{') && value.endsWith('}')) return value;

  if (token.rootOpeningEnd !== undefined) return `{${value}}`;

  return `{<>${token.value}</>}`;
}

function renderTargetExpression(expression: TargetExpressionNode, context: TargetRenderContext): string {
  if (expression.kind === 'reference') return expression.code;

  if (expression.kind === 'conditional') {
    return `${renderTargetExpression(expression.test, context)} ? ${renderExpressionOutput(expression.output, context)} : null`;
  }

  return `(${expression.parameters.join(', ')}) => (${renderExpressionOutput(expression.output, context)})`;
}

function renderExpressionOutput(output: TargetOutput, context: TargetRenderContext): string {
  if (isTargetExpression(output)) return renderTargetExpression(readTargetExpression(output), context);

  if (isTargetWithProps(output)) return renderWithProps(output.children, output.props, context).trim();

  return renderTargetOutput(output, context).trim();
}

function renderWithProps(
  children: TargetOutput,
  props: TargetExpressionNode | Readonly<Record<string, unknown>>,
  context: TargetRenderContext
): string {
  if (!isSourceChildrenToken(children)) {
    throw new Error('vjsc/target: host props require source-backed children.');
  }

  const attributes = isExpressionNode(props)
    ? [`{...${renderTargetExpression(props, context)}}`]
    : renderTargetAttributes({ [TARGET_NODE]: true, type: TARGET_HOST, props: { ...props }, key: null }, context);

  if (children.rootOpeningEnd === undefined) {
    const host = context.target.jsx.host;
    if (!host) throw new Error('vjsc/target: dynamic host children require a target JSX host runtime.');

    const name = context.imports.reference(host);

    return `<${name}${attributes.length ? ` ${attributes.join(' ')}` : ''}>${children.value}</${name}>`;
  }

  const insertion = children.rootOpeningEnd - (children.value[children.rootOpeningEnd - 2] === '/' ? 2 : 1);

  return `${children.value.slice(0, insertion)}${attributes.length ? ` ${attributes.join(' ')}` : ''}${children.value.slice(insertion)}`;
}

function isExpressionNode(
  value: TargetExpressionNode | Readonly<Record<string, unknown>>
): value is TargetExpressionNode {
  return value.kind === 'reference' || value.kind === 'function' || value.kind === 'conditional';
}

function renderTargetReference(
  reference: TargetReference,
  context: TargetRenderContext,
  seen: Set<TargetReference>
): string {
  if (seen.has(reference)) throw new Error('vjsc/target: component target references form a cycle.');

  seen.add(reference);

  if (reference.kind === 'element') {
    if (reference.import) context.imports.sideEffect(reference.import.from);

    return reference.tagName;
  }

  if (reference.kind === 'import') return context.imports.reference(reference.import);

  const path: ComponentTargetPath = { component: reference.component, part: reference.part };
  const resolved = context.target.resolve(path);

  if (!resolved || !isTargetElement(resolved)) {
    throw new Error(
      `Component target did not resolve <${reference.component}${reference.part ? `.${reference.part}` : ''}>.`
    );
  }

  return renderTargetReference(resolved[TARGET_ELEMENT], context, seen);
}

function targetAttributeName(name: string, attributes: ComponentTarget['jsx']['attributes']): string {
  if (attributes === 'react') return name;

  return htmlAttributeName(name);
}

export function isTargetNode(value: unknown): value is TargetNode {
  return Boolean(value && typeof value === 'object' && (value as Partial<TargetNode>)[TARGET_NODE] === true);
}
