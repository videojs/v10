import ts from 'typescript';

import { addNamedImport } from '../transforms/add-import';
import { replaceJsxPropValue } from '../utils/jsx';
import { collectReferencedIdentifiers } from '../utils/references';

import { splitClassNames } from './class-names';
import { type ClassNameInfo, type ClassNameSegment, classNameSegment, readClassName } from './jsx-class-name';
import { isGroupPeerMarker, ruleForToken, type StyleManifest, utilityGroupsForRule } from './manifest';
import { resolveManifestStyleModule } from './modules';

export type StyleMode = 'tailwind' | 'css';

interface TokenReference {
  modulePath: string;
  tokenPath: readonly string[];
}

interface SourceBindings {
  styleImports: ReadonlyMap<string, string>;
  importedModules: ReadonlySet<string>;
}

interface ResolvedClassName {
  classes: readonly string[];
  groups: readonly string[];
  passThrough: readonly ts.Expression[];
}

export interface StyleTransformOptions {
  manifest: StyleManifest;
  mode: StyleMode;
  variant?: string | undefined;
}

/** Project explicit style references to Tailwind utilities or semantic classes. */
export function createStyleTransform(options: StyleTransformOptions): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    const factory = transformContext.factory;
    return (sourceFile) => {
      const bindings = sourceBindings(sourceFile, options.manifest);
      if (bindings.styleImports.size === 0) return sourceFile;
      let needsClassNameComposition = false;
      const composeClassNames = (groups: readonly string[]): ts.CallExpression => {
        needsClassNameComposition = true;

        return factory.createCallExpression(
          factory.createIdentifier('cn'),
          undefined,
          groups.map((group) => factory.createStringLiteral(group))
        );
      };

      const visit = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const info = readClassName(node);
          const transformed = info
            ? transformStyleAttribute(info, bindings, options, factory, transformContext, composeClassNames)
            : node;
          return ts.visitEachChild(transformed, visit, transformContext);
        }
        return ts.visitEachChild(node, visit, transformContext);
      };

      const transformed = ts.visitEachChild(sourceFile, visit, transformContext);
      const output = stripStyleBindings(transformed, bindings);

      return needsClassNameComposition
        ? addNamedImport(output, { source: '@videojs/utils/style', name: 'cn' }, factory)
        : output;
    };
  };
}

function stripStyleBindings(sourceFile: ts.SourceFile, bindings: SourceBindings): ts.SourceFile {
  const statements = sourceFile.statements.filter(
    (statement) =>
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !bindings.importedModules.has(statement.moduleSpecifier.text)
  );
  const output = ts.factory.updateSourceFile(sourceFile, statements);
  const styleNames = new Set(bindings.styleImports.keys());
  const unresolved = new Set([...collectReferencedIdentifiers(output)].filter((name) => styleNames.has(name)));
  if (unresolved.size > 0) {
    throw new Error(
      `Styles in \`${sourceFile.fileName}\` must use static className references. ` +
        `Could not transform: ${[...unresolved].sort().join(', ')}.`
    );
  }
  return output;
}

function transformStyleAttribute(
  info: ClassNameInfo,
  bindings: SourceBindings,
  options: StyleTransformOptions,
  factory: ts.NodeFactory,
  context: ts.TransformationContext,
  composeClassNames: (groups: readonly string[]) => ts.Expression
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (
    ts.isArrayLiteralExpression(info.expression) ||
    (info.kind === 'opaque' && ts.isCallExpression(info.expression))
  ) {
    const projected = projectStyleReferences(info.expression, bindings, options, context);
    const className = options.mode === 'css' ? staticClassName(projected) : undefined;
    const replacement = className === undefined ? projected : factory.createStringLiteral(className);

    return replacement === info.expression ? info.element : replaceJsxPropValue(info, replacement, factory);
  }

  if (info.kind === 'opaque' && ts.isConditionalExpression(info.expression)) {
    const whenTrue = resolveExpression(info.expression.whenTrue, bindings, options);
    const whenFalse = resolveExpression(info.expression.whenFalse, bindings, options);
    if (!whenTrue || !whenFalse || whenTrue.passThrough.length > 0 || whenFalse.passThrough.length > 0) {
      return info.element;
    }
    const replacement = factory.updateConditionalExpression(
      info.expression,
      info.expression.condition,
      info.expression.questionToken,
      factory.createStringLiteral(whenTrue.classes.join(' ')),
      info.expression.colonToken,
      factory.createStringLiteral(whenFalse.classes.join(' '))
    );

    return replaceJsxPropValue(info, replacement, factory);
  }

  if (info.kind !== 'segments') return info.element;

  const resolved = resolveSegments(info.segments, bindings, options);
  if (!resolved || resolved.classes.length === 0 || resolved.passThrough.length > 0) return info.element;

  if (options.mode === 'tailwind' && resolved.groups.length > 1) {
    return replaceJsxPropValue(info, composeClassNames(resolved.groups), factory);
  }

  return replaceJsxPropValue(info, factory.createStringLiteral(resolved.classes.join(' ')), factory);
}

function staticClassName(expression: ts.Expression): string | undefined {
  const values = ts.isArrayLiteralExpression(expression)
    ? expression.elements
    : ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === 'cn'
      ? expression.arguments
      : undefined;

  if (!values) return undefined;

  const strings = values.filter(ts.isStringLiteralLike);
  if (strings.length !== values.length) return undefined;

  return strings
    .map((value) => value.text)
    .filter(Boolean)
    .join(' ');
}

function resolveExpression(
  expression: ts.Expression,
  bindings: SourceBindings,
  options: StyleTransformOptions
): ResolvedClassName | undefined {
  const expressions = ts.isArrayLiteralExpression(expression)
    ? expression.elements.filter((element): element is ts.Expression => !ts.isSpreadElement(element))
    : [expression];
  if (ts.isArrayLiteralExpression(expression) && expressions.length !== expression.elements.length) return undefined;
  return resolveSegments(expressions.map(classNameSegment), bindings, options);
}

function resolveSegments(
  segments: readonly ClassNameSegment[],
  bindings: SourceBindings,
  options: StyleTransformOptions
): ResolvedClassName | undefined {
  const classes: string[] = [];
  const groups: string[] = [];
  const passThrough: ts.Expression[] = [];
  const seen = new Set<string>();

  const addGroup = (values: readonly string[]): void => {
    const group: string[] = [];

    for (const value of values) {
      if (seen.has(value)) continue;

      seen.add(value);
      classes.push(value);
      group.push(value);
    }

    if (group.length > 0) groups.push(group.join(' '));
  };

  for (const segment of segments) {
    if (segment.kind === 'literal') {
      addGroup(splitClassNames(segment.value));
      continue;
    }
    if (segment.kind === 'opaque') {
      passThrough.push(segment.node);
      continue;
    }
    const reference = resolveTokenReference(segment.path, bindings.styleImports);
    const rule = reference ? ruleForToken(options.manifest, reference.modulePath, reference.tokenPath) : undefined;
    if (!rule) {
      passThrough.push(segment.node);
      continue;
    }
    if (options.mode === 'css') {
      addGroup([rule.className]);
    } else {
      for (const group of utilityGroupsForRule(rule, options.variant)) addGroup(splitClassNames(group));
    }
  }

  if (options.mode === 'css') {
    const outputClasses = classes.filter((className) => !isGroupPeerMarker(className));
    return { classes: outputClasses, groups, passThrough };
  }

  return { classes, groups, passThrough };
}

function projectStyleReferences(
  expression: ts.Expression,
  bindings: SourceBindings,
  options: StyleTransformOptions,
  context: ts.TransformationContext
): ts.Expression {
  const { factory } = context;

  const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (ts.isExpression(node)) {
      const rule = styleRuleForExpression(node, bindings, options.manifest);

      if (rule) {
        const classes =
          options.mode === 'css'
            ? isGroupPeerMarker(rule.className)
              ? []
              : [rule.className]
            : utilityGroupsForRule(rule, options.variant).flatMap(splitClassNames);

        return factory.createStringLiteral(classes.join(' '));
      }

      if (ts.isCallExpression(node)) {
        const args = node.arguments
          .flatMap((argument) => {
            const rule = styleRuleForExpression(argument, bindings, options.manifest);

            if (!rule) return [ts.visitNode(argument, visit, ts.isExpression)];

            const groups =
              options.mode === 'css'
                ? isGroupPeerMarker(rule.className)
                  ? []
                  : [rule.className]
                : utilityGroupsForRule(rule, options.variant);

            return groups.map((group) => factory.createStringLiteral(group));
          })
          .filter((argument) => !ts.isStringLiteral(argument) || argument.text.length > 0);

        return factory.updateCallExpression(
          node,
          ts.visitNode(node.expression, visit, ts.isExpression),
          node.typeArguments,
          args
        );
      }

      if (ts.isArrayLiteralExpression(node)) {
        const elements = node.elements
          .flatMap((element) => {
            if (ts.isSpreadElement(element)) return [ts.visitNode(element, visit, ts.isSpreadElement)];

            const rule = styleRuleForExpression(element, bindings, options.manifest);

            if (!rule) return [ts.visitNode(element, visit, ts.isExpression)];

            const groups =
              options.mode === 'css'
                ? isGroupPeerMarker(rule.className)
                  ? []
                  : [rule.className]
                : utilityGroupsForRule(rule, options.variant);

            return groups.map((group) => factory.createStringLiteral(group));
          })
          .filter((element) => !ts.isStringLiteral(element) || element.text.length > 0);

        return factory.updateArrayLiteralExpression(node, elements);
      }
    }

    return ts.visitEachChild(node, visit, context);
  };

  return ts.visitNode(expression, visit, ts.isExpression);
}

function styleRuleForExpression(expression: ts.Expression, bindings: SourceBindings, manifest: StyleManifest) {
  const segment = classNameSegment(expression);
  const reference = segment.kind === 'token' ? resolveTokenReference(segment.path, bindings.styleImports) : undefined;

  return reference ? ruleForToken(manifest, reference.modulePath, reference.tokenPath) : undefined;
}

function sourceBindings(sourceFile: ts.SourceFile, manifest: StyleManifest): SourceBindings {
  const styleImports = new Map<string, string>();
  const importedModules = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const modulePath = resolveManifestStyleModule(sourceFile.fileName, statement.moduleSpecifier.text, manifest);
    if (!modulePath) continue;
    const importClause = statement.importClause;
    if (!importClause?.name || importClause.namedBindings) {
      throw new Error(
        `Style import \`${statement.moduleSpecifier.text}\` in \`${sourceFile.fileName}\` must use a default import.`
      );
    }
    styleImports.set(importClause.name.text, modulePath);
    importedModules.add(statement.moduleSpecifier.text);
  }

  return { styleImports, importedModules };
}

function resolveTokenReference(
  path: readonly string[],
  styleImports: ReadonlyMap<string, string>
): TokenReference | undefined {
  const [root, ...tail] = path;
  if (!root) return undefined;
  const modulePath = styleImports.get(root);
  return modulePath ? { modulePath, tokenPath: tail } : undefined;
}
