import ts from 'typescript';

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
  compose?: boolean | undefined;
}

/** Project explicit style references to Tailwind utilities or semantic classes. */
export function createStyleTransform(options: StyleTransformOptions): ts.TransformerFactory<ts.SourceFile> {
  return (transformContext) => {
    const factory = transformContext.factory;
    return (sourceFile) => {
      const bindings = sourceBindings(sourceFile, options.manifest);
      if (bindings.styleImports.size === 0) return sourceFile;

      const visit = (node: ts.Node): ts.Node => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const info = readClassName(node);
          const transformed = info ? transformStyleAttribute(info, bindings, options, factory) : node;
          return ts.visitEachChild(transformed, visit, transformContext);
        }
        return ts.visitEachChild(node, visit, transformContext);
      };

      const transformed = ts.visitEachChild(sourceFile, visit, transformContext);
      return stripStyleBindings(transformed, bindings);
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
  factory: ts.NodeFactory
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (info.kind === 'opaque' && ts.isConditionalExpression(info.expression)) {
    const whenTrue = resolveExpression(info.expression.whenTrue, bindings, options);
    const whenFalse = resolveExpression(info.expression.whenFalse, bindings, options);
    if (!whenTrue || !whenFalse || whenTrue.passThrough.length > 0 || whenFalse.passThrough.length > 0) {
      return info.element;
    }
    const composition = options.compose
      ? composeConditionalClasses(info.expression, whenTrue.classes, whenFalse.classes, factory)
      : undefined;
    const replacement = composition
      ? composition.expression
      : factory.updateConditionalExpression(
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
  if (!resolved || (resolved.classes.length === 0 && resolved.passThrough.length === 0)) return info.element;
  if (options.compose && resolved.groups.length + resolved.passThrough.length > 1) {
    return replaceJsxPropValue(
      info,
      factory.createArrayLiteralExpression([
        ...resolved.groups.map((group) => factory.createStringLiteral(group)),
        ...resolved.passThrough,
      ]),
      factory
    );
  }
  const literal = factory.createStringLiteral(resolved.classes.join(' '));
  const replacement =
    resolved.passThrough.length === 0
      ? literal
      : factory.createArrayLiteralExpression([literal, ...resolved.passThrough]);
  return replaceJsxPropValue(info, replacement, factory);
}

function composeConditionalClasses(
  expression: ts.ConditionalExpression,
  whenTrue: readonly string[],
  whenFalse: readonly string[],
  factory: ts.NodeFactory
): { expression: ts.Expression; composed: boolean } {
  let commonLength = 0;
  while (
    commonLength < whenTrue.length &&
    commonLength < whenFalse.length &&
    whenTrue[commonLength] === whenFalse[commonLength]
  ) {
    commonLength++;
  }
  if (commonLength === 0) {
    return {
      expression: factory.updateConditionalExpression(
        expression,
        expression.condition,
        expression.questionToken,
        factory.createStringLiteral(whenTrue.join(' ')),
        expression.colonToken,
        factory.createStringLiteral(whenFalse.join(' '))
      ),
      composed: false,
    };
  }

  const common = factory.createStringLiteral(whenTrue.slice(0, commonLength).join(' '));
  const trueRemainder = whenTrue.slice(commonLength).join(' ');
  const falseRemainder = whenFalse.slice(commonLength).join(' ');
  if (!trueRemainder && !falseRemainder) return { expression: common, composed: false };
  const variant = falseRemainder
    ? factory.updateConditionalExpression(
        expression,
        expression.condition,
        expression.questionToken,
        factory.createStringLiteral(trueRemainder),
        expression.colonToken,
        factory.createStringLiteral(falseRemainder)
      )
    : factory.createBinaryExpression(
        expression.condition,
        factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
        factory.createStringLiteral(trueRemainder)
      );
  return {
    expression: factory.createArrayLiteralExpression([common, variant]),
    composed: true,
  };
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
    const unique = values.filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      classes.push(value);
      return true;
    });
    if (unique.length > 0) groups.push(unique.join(' '));
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
    return { classes: outputClasses, groups: groups.filter((group) => !isGroupPeerMarker(group)), passThrough };
  }

  return { classes, groups, passThrough };
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
