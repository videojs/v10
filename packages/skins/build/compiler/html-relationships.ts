import { type CompilerTransform, DiagnosticError, diagnosticLocationFromNode } from '@videojs/compiler';
import { type JsxElementLike, singleJsxElementChild, tagName } from '@videojs/compiler/ast';
import ts from 'typescript';

/** Resolve HTML trigger-to-popup attributes while both nodes are still JSX. */
export function resolveHtmlRelationships(): CompilerTransform {
  return (context) => {
    const factory = context.factory;

    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const next = ts.visitEachChild(node, visit, context);
      if (!isJsxElementLike(next)) return next;
      if (tagName(next) === 'ButtonTooltip') return resolveButtonTooltip(next, factory);
      if (tagName(next) === 'Popover.Root') return resolvePopover(next, factory);
      return next;
    };

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function resolveButtonTooltip(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  if (!ts.isJsxElement(element)) throw invalidRelationship(element, 'ButtonTooltip must contain one button child.');
  const child = singleJsxElementChild(element.children);
  if (!child || !isJsxElementLike(child)) {
    throw invalidRelationship(element, 'ButtonTooltip must contain exactly one button element.');
  }

  const popupId = attributeExpression(attributes(element), 'id', factory);
  const commandFor = attributeExpression(attributes(child), 'commandfor', factory);
  assertCompatibleRelationship(element, popupId, commandFor);
  const id = popupId ?? commandFor ?? tooltipId(child, factory);
  const nextChild = setAttribute(child, 'commandfor', id, factory);
  const children = element.children.map((current) => (current === child ? nextChild : current));
  return updateElement(setAttribute(element, 'id', id, factory), children, factory);
}

function resolvePopover(element: JsxElementLike, factory: ts.NodeFactory): JsxElementLike {
  if (!ts.isJsxElement(element)) throw invalidRelationship(element, 'Popover.Root must contain a trigger and popup.');
  const trigger = directChild(element, 'Popover.Trigger');
  const popup = directChild(element, 'Popover.Popup');
  if (!trigger || !popup) {
    throw invalidRelationship(element, 'Popover.Root must contain exactly one direct Trigger and Popup.');
  }

  const triggerElement = singleJsxElementChild(trigger.children);
  if (!triggerElement || !isJsxElementLike(triggerElement)) {
    throw invalidRelationship(trigger, 'Popover.Trigger must contain exactly one trigger element.');
  }

  const popupId = attributeExpression(attributes(popup), 'id', factory);
  const commandFor = attributeExpression(attributes(triggerElement), 'commandfor', factory);
  assertCompatibleRelationship(element, popupId, commandFor);
  const id = popupId ?? commandFor ?? popoverId(triggerElement, factory);
  const nextTriggerElement = setAttribute(triggerElement, 'commandfor', id, factory);
  const nextTrigger = updateElement(
    trigger,
    trigger.children.map((child) => (child === triggerElement ? nextTriggerElement : child)),
    factory
  );
  const nextPopup = setAttribute(popup, 'id', id, factory);
  return updateElement(
    element,
    element.children.map((child) => (child === trigger ? nextTrigger : child === popup ? nextPopup : child)),
    factory
  );
}

function tooltipId(trigger: JsxElementLike, factory: ts.NodeFactory): ts.Expression {
  switch (tagName(trigger)) {
    case 'PlayButtonPrimitive':
      return factory.createStringLiteral('play-tooltip');
    case 'FullscreenButtonPrimitive':
      return factory.createStringLiteral('fullscreen-tooltip');
    case 'SeekButtonPrimitive': {
      const seconds = attributeExpression(attributes(trigger), 'seconds', factory) ?? factory.createNumericLiteral(10);
      return factory.createConditionalExpression(
        factory.createBinaryExpression(seconds, ts.SyntaxKind.LessThanToken, factory.createNumericLiteral(0)),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createStringLiteral('seek-backward-tooltip'),
        factory.createToken(ts.SyntaxKind.ColonToken),
        factory.createStringLiteral('seek-forward-tooltip')
      );
    }
    default:
      throw invalidRelationship(trigger, `Cannot derive a tooltip id for <${tagName(trigger)}>.`);
  }
}

function popoverId(trigger: JsxElementLike, factory: ts.NodeFactory): ts.Expression {
  if (tagName(trigger) === 'MuteButton') return factory.createStringLiteral('volume-popover');
  throw invalidRelationship(trigger, `Cannot derive a popover id for <${tagName(trigger)}>.`);
}

function assertCompatibleRelationship(
  node: ts.Node,
  popupId: ts.Expression | undefined,
  commandFor: ts.Expression | undefined
): void {
  if (!popupId || !commandFor) return;
  const popupValue = expressionText(popupId);
  const commandValue = expressionText(commandFor);
  if (popupValue === commandValue) return;
  throw invalidRelationship(
    node,
    `HTML trigger targets \`${commandValue}\`, but its popup is identified by \`${popupValue}\`.`
  );
}

function expressionText(expression: ts.Expression): string {
  if (ts.isStringLiteralLike(expression)) return expression.text;
  return expression.getText();
}

function directChild(element: ts.JsxElement, tag: string): ts.JsxElement | undefined {
  const matches = element.children.filter(
    (child): child is ts.JsxElement => ts.isJsxElement(child) && tagName(child) === tag
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function attributes(element: JsxElementLike): ts.JsxAttributes {
  return ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
}

function attributeExpression(
  attributes: ts.JsxAttributes,
  name: string,
  factory: ts.NodeFactory
): ts.Expression | undefined {
  const attribute = attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
  );
  if (!attribute) return undefined;
  if (!attribute.initializer) return factory.createTrue();
  if (ts.isStringLiteral(attribute.initializer)) return factory.createStringLiteral(attribute.initializer.text);
  if (ts.isJsxExpression(attribute.initializer)) return attribute.initializer.expression ?? undefined;
  return undefined;
}

function setAttribute(
  element: JsxElementLike,
  name: string,
  value: ts.Expression,
  factory: ts.NodeFactory
): JsxElementLike {
  const current = attributes(element);
  if (
    current.properties.some(
      (property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name
    )
  ) {
    return element;
  }

  const next = factory.updateJsxAttributes(current, [
    ...current.properties,
    factory.createJsxAttribute(factory.createIdentifier(name), factory.createJsxExpression(undefined, value)),
  ]);
  if (ts.isJsxElement(element)) {
    return factory.updateJsxElement(
      element,
      factory.updateJsxOpeningElement(
        element.openingElement,
        element.openingElement.tagName,
        element.openingElement.typeArguments,
        next
      ),
      element.children,
      element.closingElement
    );
  }
  return factory.updateJsxSelfClosingElement(element, element.tagName, element.typeArguments, next);
}

function updateElement(
  element: JsxElementLike,
  children: readonly ts.JsxChild[],
  factory: ts.NodeFactory
): JsxElementLike {
  if (!ts.isJsxElement(element)) return element;
  return factory.updateJsxElement(element, element.openingElement, children, element.closingElement);
}

function isJsxElementLike(node: ts.Node): node is JsxElementLike {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}

function invalidRelationship(node: ts.Node, message: string): DiagnosticError {
  return new DiagnosticError(message, {
    ...diagnosticLocationFromNode(node),
    diagnosticCode: 'html-relationship',
  });
}
