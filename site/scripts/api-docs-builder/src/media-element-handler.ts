/**
 * Media element reference extraction.
 *
 * Discovers media elements from packages/html/src/define/media/*.ts and extracts
 * host properties, shared attributes/events/CSS vars, and slots.
 *
 * Convention:
 *   - Define files: packages/html/src/define/media/*.ts with inline class + static tagName
 *   - Media element classes: packages/html/src/media/{name}/index.ts
 *     composed as MediaAttachMixin(CustomMediaElement('video'|'audio', Host))
 *   - Host classes: packages/core/src/dom/media/{name}/index.ts extending
 *     HTMLVideoElementHost or HTMLAudioElementHost with getter/setter pairs
 *   - Shared data: packages/core/src/dom/media/custom-media-element/index.ts
 *     exports CustomMediaElement factory (with static properties), VideoCSSVars,
 *     AudioCSSVars, and template functions
 *   - Slots: parsed from getVideoTemplateHTML / getCommonTemplateHTML in custom-media-element
 *
 * Exclusions (elements discovered but intentionally skipped):
 *   - container.ts: re-exports a class, doesn't declare one inline → no static tagName found
 *   - background-video.ts: uses MediaAttachMixin(HTMLElement) without CustomMediaElement →
 *     parseCustomMediaElementCall returns null. Its API reference is manually maintained in MDX.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCSSVars } from './css-vars-handler.js';
import type { HostPropertyDef, MediaElementReference, MediaElementResult } from './pipeline.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Classes that mark the end of the host prototype chain for property extraction. */
const HOST_BASE_CLASSES = new Set([
  'HTMLMediaElementHost',
  'HTMLVideoElementHost',
  'HTMLAudioElementHost',
  'EventTarget',
]);

// ─── Types ───────────────────────────────────────────────────────────

interface MediaElementSource {
  defineFilePath: string;
  className: string;
  tagName: string;
  mediaFilePath: string;
  hostFilePath: string;
  hostClassName: string;
  mediaType: 'video' | 'audio';
}

// ─── Module Resolution ───────────────────────────────────────────────

/**
 * Resolve an import specifier to an absolute file path using TypeScript's
 * module resolution. Handles both relative paths and workspace package
 * imports (e.g., @videojs/core/dom/media/hls) via the project's tsconfig.
 *
 * Workspace imports go through `package.json#exports` and resolve to the
 * built `dist/dev/*.d.ts` files, where the TypeScript compiler has collapsed
 * mixin chains into opaque `_base` aliases. To preserve the original mixin
 * structure for extraction, we remap the resolved dist `.d.ts` path back to
 * the corresponding source `.ts` file.
 */
function resolveModuleToFile(
  fromFile: string,
  importSpecifier: string,
  compilerOptions: ts.CompilerOptions
): string | undefined {
  const result = ts.resolveModuleName(importSpecifier, fromFile, compilerOptions, ts.sys);
  const resolved = result.resolvedModule?.resolvedFileName;
  if (!resolved) return undefined;
  return mapDistToSource(resolved);
}

function mapDistToSource(resolvedPath: string): string {
  if (!resolvedPath.endsWith('.d.ts')) return resolvedPath;
  const match = resolvedPath.match(/^(.+\/packages\/[^/]+)\/dist\/dev\/(.+)\.d\.ts$/);
  if (!match) return resolvedPath;
  const [, pkgRoot, rest] = match;
  const candidates = [`${pkgRoot}/src/${rest}.ts`, `${pkgRoot}/src/${rest}/index.ts`];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return resolvedPath;
}

// ─── Discovery ───────────────────────────────────────────────────────

function discoverMediaElements(monorepoRoot: string, compilerOptions: ts.CompilerOptions): MediaElementSource[] {
  const defineDir = path.join(monorepoRoot, 'packages/html/src/define/media');
  if (!fs.existsSync(defineDir)) return [];

  const files = fs.readdirSync(defineDir).filter((f) => f.endsWith('.ts'));
  const sources: MediaElementSource[] = [];

  for (const file of files) {
    const filePath = path.join(defineDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const result = parseDefineFile(sourceFile, filePath, compilerOptions);
    if (result) {
      sources.push(result);
    }
  }

  return sources;
}

/**
 * Parse a define/media file to extract class name, tagName, and import chain.
 * Returns null if the file doesn't declare an inline class with static tagName
 * (container.ts) or if the class doesn't use CustomMediaElement (background-video.ts).
 */
function parseDefineFile(
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions
): MediaElementSource | null {
  let className: string | undefined;
  let tagName: string | undefined;
  let baseClassName: string | undefined;
  let baseImportPath: string | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name) return;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;
    if (!node.heritageClauses) return;

    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    for (const member of node.members) {
      if (
        ts.isPropertyDeclaration(member) &&
        member.name &&
        ts.isIdentifier(member.name) &&
        member.name.text === 'tagName' &&
        member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
        member.initializer &&
        ts.isStringLiteral(member.initializer)
      ) {
        className = node.name.text;
        tagName = member.initializer.text;
        baseClassName = extendsClause.types[0]!.expression.getText(sourceFile);
        break;
      }
    }
  });

  if (!className || !tagName || !baseClassName) return null;

  // Resolve the import path for the base class
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const importClause = node.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;

    for (const specifier of importClause.namedBindings.elements) {
      if (specifier.name.text === baseClassName) {
        baseImportPath = node.moduleSpecifier.text;
        break;
      }
    }
  });

  if (!baseImportPath) return null;

  const mediaFilePath = resolveModuleToFile(filePath, baseImportPath, compilerOptions);
  if (!mediaFilePath) return null;

  // Parse the media element file to find the CustomMediaElement(tag, Host) call
  const mediaContent = fs.readFileSync(mediaFilePath, 'utf-8');
  const mediaSourceFile = ts.createSourceFile(mediaFilePath, mediaContent, ts.ScriptTarget.Latest, true);

  const hostInfo = parseCustomMediaElementCall(mediaSourceFile, baseClassName);
  if (!hostInfo) return null;

  // Resolve host class import path
  let hostImportPath: string | undefined;
  ts.forEachChild(mediaSourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const importClause = node.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;

    for (const specifier of importClause.namedBindings.elements) {
      if (specifier.name.text === hostInfo.hostClassName) {
        hostImportPath = node.moduleSpecifier.text;
        break;
      }
    }
  });

  if (!hostImportPath) return null;

  const hostFilePath = resolveModuleToFile(mediaFilePath, hostImportPath, compilerOptions);
  if (!hostFilePath) return null;

  return {
    defineFilePath: filePath,
    className: stripElementSuffix(className),
    tagName,
    mediaFilePath,
    hostFilePath,
    hostClassName: hostInfo.hostClassName,
    mediaType: hostInfo.mediaType,
  };
}

function stripElementSuffix(name: string): string {
  return name.endsWith('Element') ? name.slice(0, -'Element'.length) : name;
}

/**
 * Parse the media element class to find the CustomMediaElement(tag, Host) call.
 * Returns null for elements that don't use CustomMediaElement (e.g., BackgroundVideo).
 */
function parseCustomMediaElementCall(
  sourceFile: ts.SourceFile,
  className: string
): { hostClassName: string; mediaType: 'video' | 'audio' } | null {
  let hostClassName: string | undefined;
  let mediaType: 'video' | 'audio' | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node)) return;
    if (!node.name || node.name.text !== className) return;
    if (!node.heritageClauses) return;

    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    const extendsExpr = extendsClause.types[0]!.expression;
    findCustomMediaElement(extendsExpr);
  });

  function findCustomMediaElement(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'CustomMediaElement'
    ) {
      if (node.arguments.length >= 2) {
        // First arg: media type string literal ('video' or 'audio')
        const tagArg = node.arguments[0]!;
        if (ts.isStringLiteral(tagArg)) {
          mediaType = tagArg.text === 'audio' ? 'audio' : 'video';
        }
        // Second arg: host class identifier
        const hostArg = node.arguments[1]!;
        if (ts.isIdentifier(hostArg)) {
          hostClassName = hostArg.text;
        }
      }
      return;
    }
    ts.forEachChild(node, findCustomMediaElement);
  }

  if (!hostClassName || !mediaType) return null;
  return { hostClassName, mediaType };
}

// ─── Host Property Extraction ───────────────────────────────────────

/**
 * Extract getter/setter pairs from a host class and its ancestors,
 * mirroring what CustomMediaElement does at runtime when it walks
 * the MediaHost prototype chain.
 */
function extractHostProperties(
  filePath: string,
  hostClassName: string,
  compilerOptions: ts.CompilerOptions,
  nativeNames: Set<string>
): Record<string, HostPropertyDef> {
  const properties: Record<string, HostPropertyDef> = {};
  extractClassProperties(filePath, hostClassName, properties, compilerOptions, new Set(), nativeNames);
  return properties;
}

/**
 * Recursively extract getter/setter pairs from a class and its parent chain.
 * Handles both `extends Identifier` and `extends MixinA(MixinB(Base))`. Child
 * properties override parent properties (checked via the `seen` set). Stops
 * at host base classes (HTMLMediaElementHost, HTMLVideoElementHost, etc.).
 */
function extractClassProperties(
  filePath: string,
  className: string,
  properties: Record<string, HostPropertyDef>,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  nativeNames: Set<string>
): void {
  if (seen.has(`${filePath}:${className}`)) return;
  seen.add(`${filePath}:${className}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  let classNode: ts.ClassDeclaration | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      classNode = node;
    }
  });
  if (!classNode) return;

  // Process the extends chain BEFORE applying own getters/setters, so that
  // child overrides win in the merge step at the end of applyClassMembers.
  const extendsClause = classNode.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
  if (extendsClause && extendsClause.types.length > 0) {
    const extendsExpr = unwrapExpression(extendsClause.types[0]!.expression);
    processExtendsExpression(extendsExpr, sourceFile, filePath, properties, compilerOptions, seen, nativeNames);
  }

  applyClassMembers(classNode, sourceFile, properties, nativeNames);
}

/** Strip parens and `as Foo` casts from an expression. */
function unwrapExpression(expr: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) {
    expr = expr.expression;
  }
  return expr;
}

/**
 * Process an `extends` expression — either an `Identifier` (regular class
 * inheritance) or a `CallExpression` (mixin chain like `OuterMixin(InnerMixin(Base))`).
 * Mixins are applied innermost-first so that outer mixin overrides win.
 */
function processExtendsExpression(
  extendsExpr: ts.Expression,
  sourceFile: ts.SourceFile,
  filePath: string,
  properties: Record<string, HostPropertyDef>,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  nativeNames: Set<string>
): void {
  if (ts.isIdentifier(extendsExpr)) {
    const parentClassName = extendsExpr.text;
    if (HOST_BASE_CLASSES.has(parentClassName)) return;
    const parentImportPath = findImportPath(sourceFile, parentClassName);
    if (parentImportPath) {
      const parentFilePath = resolveModuleToFile(filePath, parentImportPath, compilerOptions);
      if (parentFilePath) {
        extractClassProperties(parentFilePath, parentClassName, properties, compilerOptions, seen, nativeNames);
      }
    } else {
      // Parent is declared in the same file.
      extractClassProperties(filePath, parentClassName, properties, compilerOptions, seen, nativeNames);
    }
    return;
  }

  if (ts.isCallExpression(extendsExpr)) {
    const { mixins, base } = unwindMixinChain(extendsExpr);
    // Process the base class first (innermost identifier), then layer each
    // mixin from innermost to outermost so outer mixins override inner ones.
    processExtendsExpression(base, sourceFile, filePath, properties, compilerOptions, seen, nativeNames);
    for (let i = mixins.length - 1; i >= 0; i--) {
      processMixin(mixins[i]!.name, sourceFile, filePath, properties, compilerOptions, seen, nativeNames);
    }
  }
}

/**
 * Unwind a mixin call chain like `OuterMixin(InnerMixin(Base))` into a list
 * of mixin names (outermost first) and the innermost expression (the base).
 * Parens and `as` casts are stripped between layers.
 */
function unwindMixinChain(callExpr: ts.CallExpression): {
  mixins: Array<{ name: string }>;
  base: ts.Expression;
} {
  const mixins: Array<{ name: string }> = [];
  let current: ts.Expression = callExpr;
  while (ts.isCallExpression(current)) {
    if (ts.isIdentifier(current.expression)) {
      mixins.push({ name: current.expression.text });
    } else {
      // Non-identifier callee — give up walking further down.
      break;
    }
    if (current.arguments.length === 0) break;
    current = unwrapExpression(current.arguments[0]!);
  }
  return { mixins, base: current };
}

/**
 * Walk a mixin function and merge the inner class's getters/setters into
 * `properties`. Supports the three mixin shapes used in this codebase:
 *   A: `function MixinName(arg) { class Inner extends arg { ... } }`
 *   B: `const MixinName: Mixin<...> = (arg) => { class Inner extends arg { ... } }`
 *   C: `const MixinName = <Base extends ...>(arg) => { class Inner extends arg { ... } }`
 *
 * The inner class always extends a function parameter; we don't recurse on
 * that — the outer chain walk already handles the base.
 */
function processMixin(
  mixinName: string,
  callerSourceFile: ts.SourceFile,
  callerFilePath: string,
  properties: Record<string, HostPropertyDef>,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  nativeNames: Set<string>
): void {
  const resolved = resolveMixinDeclaration(mixinName, callerSourceFile, callerFilePath, compilerOptions, new Set());
  if (!resolved) return;

  const seenKey = `${resolved.filePath}::mixin::${resolved.name}`;
  if (seen.has(seenKey)) return;
  seen.add(seenKey);

  applyClassMembers(resolved.innerClass, resolved.sourceFile, properties, nativeNames);
}

/**
 * Resolve a mixin name to the file containing its declaration and the inner
 * class returned by the mixin. Follows re-exports through barrel files
 * (`export { Foo } from './bar'`). Returns `undefined` if not found.
 */
function resolveMixinDeclaration(
  mixinName: string,
  callerSourceFile: ts.SourceFile,
  callerFilePath: string,
  compilerOptions: ts.CompilerOptions,
  visited: Set<string>
): { name: string; filePath: string; sourceFile: ts.SourceFile; innerClass: ts.ClassDeclaration } | undefined {
  const importPath = findImportPath(callerSourceFile, mixinName);
  let mixinFilePath: string;
  if (importPath) {
    const resolved = resolveModuleToFile(callerFilePath, importPath, compilerOptions);
    if (!resolved) return undefined;
    mixinFilePath = resolved;
  } else {
    mixinFilePath = callerFilePath;
  }

  const visitKey = `${mixinFilePath}::${mixinName}`;
  if (visited.has(visitKey)) return undefined;
  visited.add(visitKey);

  const content = fs.readFileSync(mixinFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(mixinFilePath, content, ts.ScriptTarget.Latest, true);

  const innerClass = findMixinInnerClass(sourceFile, mixinName);
  if (innerClass) {
    return { name: mixinName, filePath: mixinFilePath, sourceFile, innerClass };
  }

  // Not declared here — follow a re-export if present.
  const reExport = findReExportSource(sourceFile, mixinName);
  if (!reExport) return undefined;

  const targetName = reExport.exportedName;
  const targetFilePath = resolveModuleToFile(mixinFilePath, reExport.moduleSpecifier, compilerOptions);
  if (!targetFilePath) return undefined;
  const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
  const targetSourceFile = ts.createSourceFile(targetFilePath, targetContent, ts.ScriptTarget.Latest, true);

  const targetVisitKey = `${targetFilePath}::${targetName}`;
  if (visited.has(targetVisitKey)) return undefined;
  visited.add(targetVisitKey);

  const targetInner = findMixinInnerClass(targetSourceFile, targetName);
  if (targetInner) {
    return { name: targetName, filePath: targetFilePath, sourceFile: targetSourceFile, innerClass: targetInner };
  }

  // Multi-hop re-export (rare).
  return resolveMixinDeclaration(targetName, targetSourceFile, targetFilePath, compilerOptions, visited);
}

/**
 * Look for a `export { Foo } from './bar'` (or `export { Foo as Bar } from './bar'`)
 * matching the given name. Returns the source module specifier and the actual
 * exported identifier in the target module.
 */
function findReExportSource(
  sourceFile: ts.SourceFile,
  name: string
): { moduleSpecifier: string; exportedName: string } | undefined {
  let result: { moduleSpecifier: string; exportedName: string } | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (result) return;
    if (!ts.isExportDeclaration(node)) return;
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) return;
    for (const specifier of node.exportClause.elements) {
      // `export { Foo as Bar }` — `propertyName` = original (Foo), `name` = alias (Bar).
      const localName = specifier.name.text;
      const targetName = (specifier.propertyName ?? specifier.name).text;
      if (localName === name) {
        result = { moduleSpecifier: node.moduleSpecifier.text, exportedName: targetName };
        return;
      }
    }
  });
  return result;
}

/**
 * Find the inner class declared inside a mixin function whose `extends`
 * targets one of the function's parameters.
 */
function findMixinInnerClass(sourceFile: ts.SourceFile, mixinName: string): ts.ClassDeclaration | undefined {
  let result: ts.ClassDeclaration | undefined;

  function scanBody(body: ts.Node, paramNames: Set<string>): void {
    function visit(n: ts.Node): void {
      if (result) return;
      if (ts.isClassDeclaration(n) && n.heritageClauses) {
        const ext = n.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
        if (ext && ext.types.length > 0) {
          const extExpr = unwrapExpression(ext.types[0]!.expression);
          if (ts.isIdentifier(extExpr) && paramNames.has(extExpr.text)) {
            result = n;
            return;
          }
        }
      }
      ts.forEachChild(n, visit);
    }
    ts.forEachChild(body, visit);
  }

  ts.forEachChild(sourceFile, (node) => {
    if (result) return;

    // Shape A: function declaration
    if (ts.isFunctionDeclaration(node) && node.name?.text === mixinName && node.body) {
      scanBody(node.body, getParameterNames(node.parameters));
      return;
    }

    // Shapes B / C: const arrow / function expression
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === mixinName &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          const body = decl.initializer.body;
          if (ts.isBlock(body)) {
            scanBody(body, getParameterNames(decl.initializer.parameters));
          }
          return;
        }
      }
    }
  });

  return result;
}

function getParameterNames(params: ts.NodeArray<ts.ParameterDeclaration>): Set<string> {
  const names = new Set<string>();
  for (const p of params) {
    if (ts.isIdentifier(p.name)) names.add(p.name.text);
  }
  return names;
}

/**
 * Collect getter/setter pairs from a single class node and merge them into
 * `properties`. Description fallback: if a child override has no JSDoc,
 * the closest ancestor's description is preserved.
 */
function applyClassMembers(
  classNode: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  properties: Record<string, HostPropertyDef>,
  nativeNames: Set<string>
): void {
  const getters = new Map<string, { type: string; description?: string }>();
  const setters = new Set<string>();

  for (const member of classNode.members) {
    if (!ts.isGetAccessorDeclaration(member) && !ts.isSetAccessorDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;

    const name = member.name.text;
    if (name.startsWith('_') || name.startsWith('#')) continue;
    // target is an internal reference to the native media element, not a user-facing property
    if (name === 'target') continue;

    if (ts.isGetAccessorDeclaration(member)) {
      let type = 'unknown';
      if (member.type) {
        type = member.type.getText(sourceFile);
      }
      const description = getJSDocDescription(member);
      getters.set(name, { type, description });
    } else if (ts.isSetAccessorDeclaration(member)) {
      setters.add(name);
    }
  }

  for (const [name, info] of getters) {
    const def: HostPropertyDef = {
      type: info.type,
      readonly: !setters.has(name),
    };
    // Description fallback: keep parent's if child has none.
    const description = info.description ?? properties[name]?.description;
    if (description) def.description = description;
    if (nativeNames.has(name)) def.overridesNative = true;
    properties[name] = def;
  }
}

function findImportPath(sourceFile: ts.SourceFile, name: string): string | undefined {
  let importPath: string | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (importPath) return;
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const importClause = node.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;
    for (const specifier of importClause.namedBindings.elements) {
      const importedName = (specifier.propertyName ?? specifier.name).text;
      if (importedName === name) {
        importPath = node.moduleSpecifier.text;
        return;
      }
    }
  });
  return importPath;
}

// ─── JSDoc Extraction ────────────────────────────────────────────────

function getJSDocDescription(node: ts.Node): string | undefined {
  const jsDocNodes = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (!jsDocNodes || jsDocNodes.length === 0) return undefined;

  const doc = jsDocNodes[0]!;
  if (typeof doc.comment === 'string') return doc.comment;
  if (!doc.comment) return undefined;

  const parts: string[] = [];
  for (const part of doc.comment) {
    if (typeof part === 'string') {
      parts.push(part);
    } else if ('text' in part) {
      parts.push(part.text);
    }
  }
  return parts.join('') || undefined;
}

// ─── Shared Data Extraction ──────────────────────────────────────────

/**
 * Extract native attribute names from the `static properties` object inside
 * the CustomMediaElement factory. Each key maps to an attribute name via
 * `props[key].attribute ?? key.toLowerCase()`.
 */
function extractStaticProperties(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const attributes: string[] = [];

  function visit(node: ts.Node): void {
    // Look for: static properties = { ... }
    if (
      ts.isPropertyDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'properties' &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

        const propName = prop.name.text;
        let attrName = propName.toLowerCase();

        // Check for explicit `attribute` override in the property config
        if (ts.isObjectLiteralExpression(prop.initializer)) {
          for (const configProp of prop.initializer.properties) {
            if (
              ts.isPropertyAssignment(configProp) &&
              ts.isIdentifier(configProp.name) &&
              configProp.name.text === 'attribute' &&
              ts.isStringLiteral(configProp.initializer)
            ) {
              attrName = configProp.initializer.text;
            }
          }
        }

        attributes.push(attrName);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return attributes;
}

function extractSlotsFromTemplate(filePath: string, templateFnName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const slots: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === templateFnName && node.body) {
      const templateText = extractTemplateString(node.body);
      if (templateText) {
        parseSlots(templateText, slots);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return slots;
}

/**
 * Extract slots from getCommonTemplateHTML — a factory function that returns
 * a function containing the template string.
 */
function extractSlotsFromTemplateFactory(filePath: string, factoryFnName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const slots: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === factoryFnName && node.body) {
      // The factory returns a function — look for a return statement with a function/arrow
      for (const stmt of node.body.statements) {
        if (ts.isReturnStatement(stmt) && stmt.expression) {
          // Could be an arrow function or function expression
          let innerBody: ts.Block | ts.Expression | undefined;
          if (ts.isArrowFunction(stmt.expression)) {
            innerBody = stmt.expression.body;
          } else if (ts.isFunctionExpression(stmt.expression)) {
            innerBody = stmt.expression.body;
          }

          if (innerBody) {
            const templateText = ts.isBlock(innerBody)
              ? extractTemplateString(innerBody)
              : getTemplateText(innerBody as ts.Expression);
            if (templateText) {
              parseSlots(templateText, slots);
            }
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return slots;
}

function extractTemplateString(block: ts.Block): string | undefined {
  for (const stmt of block.statements) {
    if (ts.isReturnStatement(stmt) && stmt.expression) {
      return getTemplateText(stmt.expression);
    }
  }
  return undefined;
}

function getTemplateText(node: ts.Expression): string | undefined {
  if (ts.isTaggedTemplateExpression(node)) {
    return getTemplateText(node.template);
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      text += span.literal.text;
    }
    return text;
  }
  return undefined;
}

function parseSlots(html: string, slots: string[]): void {
  const slotRegex = /<slot(?:\s+name="([^"]*)")?[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = slotRegex.exec(html)) !== null) {
    const name = match[1] ?? '';
    slots.push(name);
  }
}

// ─── Event Extraction ────────────────────────────────────────────────

/**
 * Extract event names from a composite event interface (e.g. VideoEvents, AudioEvents)
 * by walking its `extends` chain and collecting property keys from each parent interface.
 *
 * Convention: capability event interfaces (MediaPlaybackEvents, etc.) are flat
 * `eventName: EventLike` maps, and VideoEvents/AudioEvents compose them via `extends`.
 */
function extractEventsFromTypes(filePath: string, interfaceName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  // Build a map of interface name → { extends list, own property keys }
  const interfaces = new Map<string, { extends: string[]; keys: string[] }>();

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isInterfaceDeclaration(node) || !node.name) return;

    const name = node.name.text;
    const extendsList: string[] = [];
    const keys: string[] = [];

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        for (const type of clause.types) {
          if (ts.isIdentifier(type.expression)) {
            extendsList.push(type.expression.text);
          }
        }
      }
    }

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        keys.push(member.name.text);
      }
    }

    interfaces.set(name, { extends: extendsList, keys });
  });

  // Recursively collect keys from the target interface and all ancestors
  const events: string[] = [];
  const visited = new Set<string>();

  function collect(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const iface = interfaces.get(name);
    if (!iface) return;

    for (const parent of iface.extends) {
      collect(parent);
    }
    events.push(...iface.keys);
  }

  collect(interfaceName);
  return events;
}

/**
 * Scan a host class (and its mixin/parent chain) for `this.dispatchEvent(new Event('name'))`
 * style calls and return the set of event names dispatched. Forwarding patterns like
 * `new (event.constructor as ...)(event.type, event)` are naturally skipped because their
 * first argument is not a `StringLiteral`.
 */
function extractDispatchedEvents(
  filePath: string,
  className: string,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  events: Set<string>
): Set<string> {
  const fileScanKey = `${filePath}::dispatchEvents`;
  if (!seen.has(fileScanKey)) {
    seen.add(fileScanKey);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    scanForDispatchEvents(sourceFile, events);

    let classNode: ts.ClassDeclaration | undefined;
    ts.forEachChild(sourceFile, (n) => {
      if (ts.isClassDeclaration(n) && n.name?.text === className) {
        classNode = n;
      }
    });
    if (classNode) {
      const extendsClause = classNode.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
      if (extendsClause && extendsClause.types.length > 0) {
        const extendsExpr = unwrapExpression(extendsClause.types[0]!.expression);
        walkExtendsForDispatchEvents(extendsExpr, sourceFile, filePath, compilerOptions, seen, events);
      }
    }
  }
  return events;
}

function walkExtendsForDispatchEvents(
  extendsExpr: ts.Expression,
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  events: Set<string>
): void {
  if (ts.isIdentifier(extendsExpr)) {
    const parentName = extendsExpr.text;
    if (HOST_BASE_CLASSES.has(parentName)) return;
    const parentImportPath = findImportPath(sourceFile, parentName);
    if (parentImportPath) {
      const parentFilePath = resolveModuleToFile(filePath, parentImportPath, compilerOptions);
      if (parentFilePath) {
        extractDispatchedEvents(parentFilePath, parentName, compilerOptions, seen, events);
      }
    } else {
      extractDispatchedEvents(filePath, parentName, compilerOptions, seen, events);
    }
    return;
  }

  if (ts.isCallExpression(extendsExpr)) {
    const { mixins, base } = unwindMixinChain(extendsExpr);
    walkExtendsForDispatchEvents(base, sourceFile, filePath, compilerOptions, seen, events);
    for (const mixin of mixins) {
      const importPath = findImportPath(sourceFile, mixin.name);
      let mixinFilePath: string;
      if (importPath) {
        const resolved = resolveModuleToFile(filePath, importPath, compilerOptions);
        if (!resolved) continue;
        mixinFilePath = resolved;
      } else {
        mixinFilePath = filePath;
      }
      const key = `${mixinFilePath}::dispatchEvents`;
      if (seen.has(key)) continue;
      seen.add(key);
      const content = fs.readFileSync(mixinFilePath, 'utf-8');
      const mixinSourceFile = ts.createSourceFile(mixinFilePath, content, ts.ScriptTarget.Latest, true);
      scanForDispatchEvents(mixinSourceFile, events);
    }
  }
}

function scanForDispatchEvents(sourceFile: ts.SourceFile, events: Set<string>): void {
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'dispatchEvent' &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0]!;
      if (ts.isNewExpression(arg) && arg.arguments && arg.arguments.length > 0) {
        const eventArg = arg.arguments[0]!;
        if (ts.isStringLiteral(eventArg)) {
          events.add(eventArg.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Build the set of property names declared on `HTMLMediaElement`,
 * `HTMLVideoElement`, and `HTMLAudioElement` (per `lib.dom.d.ts`). Used to
 * tag host properties that override a native member.
 */
function collectNativeMemberNames(program: ts.Program, anchorFile: ts.SourceFile): Set<string> {
  const checker = program.getTypeChecker();
  const names = new Set<string>();
  for (const ifaceName of ['HTMLMediaElement', 'HTMLVideoElement', 'HTMLAudioElement']) {
    const symbol = checker.resolveName(ifaceName, anchorFile, ts.SymbolFlags.Type, false);
    if (!symbol) continue;
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    for (const member of type.getProperties()) {
      names.add(member.getName());
    }
  }
  return names;
}

// ─── Pipeline ────────────────────────────────────────────────────────

export function generateMediaElementReferences(monorepoRoot: string): MediaElementResult[] {
  const tsconfigPath = path.join(monorepoRoot, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);
  config.options.rootDir = monorepoRoot;
  const compilerOptions = config.options;

  const sources = discoverMediaElements(monorepoRoot, compilerOptions);
  if (sources.length === 0) return [];

  const customMediaPath = path.join(monorepoRoot, 'packages/core/src/dom/media/custom-media-element/index.ts');
  if (!fs.existsSync(customMediaPath)) return [];

  // Read shared data
  const allAttributes = extractStaticProperties(customMediaPath);

  // Extract events from capability contract types
  const mediaTypesPath = path.join(monorepoRoot, 'packages/core/src/core/media/types.ts');
  const videoEvents = fs.existsSync(mediaTypesPath) ? extractEventsFromTypes(mediaTypesPath, 'VideoEvents') : [];
  const audioEvents = fs.existsSync(mediaTypesPath) ? extractEventsFromTypes(mediaTypesPath, 'AudioEvents') : [];

  // Extract CSS vars using the existing handler (needs a TS program).
  // Ensure `lib.dom.d.ts` is loaded so HTMLMediaElement / HTMLVideoElement /
  // HTMLAudioElement member names can be resolved for the `overridesNative`
  // tag — `tsconfig.base.json` only lists `ES2022`.
  const programOptions: ts.CompilerOptions = {
    ...compilerOptions,
    lib: dedupeStrings([...(compilerOptions.lib ?? []), 'lib.dom.d.ts']),
  };
  const program = ts.createProgram([customMediaPath], programOptions);
  const videoCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Video');
  const audioCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Audio');

  // Collect native HTMLMediaElement/Video/Audio member names from lib.dom.d.ts.
  const customMediaSourceFile = program.getSourceFile(customMediaPath);
  const nativeNames = customMediaSourceFile
    ? collectNativeMemberNames(program, customMediaSourceFile)
    : new Set<string>();

  const videoCSSVars: Record<string, { description: string }> = {};
  if (videoCSSVarsRaw) {
    for (const v of videoCSSVarsRaw.vars) {
      videoCSSVars[v.name] = { description: v.description };
    }
  }

  const audioCSSVars: Record<string, { description: string }> = {};
  if (audioCSSVarsRaw) {
    for (const v of audioCSSVarsRaw.vars) {
      audioCSSVars[v.name] = { description: v.description };
    }
  }

  // Extract slots from template functions
  const videoSlots = extractSlotsFromTemplate(customMediaPath, 'getVideoTemplateHTML');
  const audioSlots = extractSlotsFromTemplateFactory(customMediaPath, 'getCommonTemplateHTML');

  const results: MediaElementResult[] = [];

  for (const source of sources) {
    const hostProperties = extractHostProperties(
      source.hostFilePath,
      source.hostClassName,
      compilerOptions,
      nativeNames
    );

    // Deduplicate: host props that overlap with native attributes
    const hostAttrNames = new Set<string>();
    for (const propName of Object.keys(hostProperties)) {
      hostAttrNames.add(propName.toLowerCase());
    }
    const nativeAttributes = allAttributes.filter((attr) => !hostAttrNames.has(attr));

    const cssCustomProperties = source.mediaType === 'video' ? videoCSSVars : audioCSSVars;
    const slots = source.mediaType === 'video' ? videoSlots : audioSlots;
    const native = source.mediaType === 'video' ? videoEvents : audioEvents;

    const dispatched = extractDispatchedEvents(
      source.hostFilePath,
      source.hostClassName,
      compilerOptions,
      new Set(),
      new Set()
    );
    const nativeSet = new Set(native);
    const elementSpecific = [...dispatched].filter((e) => !nativeSet.has(e)).sort();

    const reference: MediaElementReference = {
      name: source.className,
      tagName: source.tagName,
      hostProperties,
      nativeAttributes,
      events: { native, elementSpecific },
      cssCustomProperties,
      slots,
    };

    results.push({ name: source.className, reference });
  }

  return results;
}
