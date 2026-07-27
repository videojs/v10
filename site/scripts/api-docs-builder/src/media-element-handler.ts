/**
 * Media element reference extraction.
 *
 * Discovers media elements from packages/html/src/define/media/*.ts and extracts
 * host properties, shared attributes/events, and CSS vars.
 *
 * Convention:
 *   - Define files: packages/html/src/define/media/*.ts with inline class + static tagName
 *   - Media element classes: packages/html/src/media/{name}/index.ts
 *     composed as MediaAttachMixin(CustomMediaElement('video'|'audio', Host))
 *   - Host classes: packages/core/src/dom/media/{name}/index.ts extending
 *     HTMLVideoElementHost or HTMLAudioElementHost with getter/setter pairs
 *   - Shared data: packages/core/src/dom/media/custom-media-element/index.ts
 *     exports CustomMediaElement factory (with static properties), VideoCSSVars,
 *     AudioCSSVars
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
import type {
  HostPropertyDef,
  MediaElementReference,
  MediaElementResult,
  MediaEventDef,
  MediaTargetTag,
  ReactMediaReference,
} from './pipeline.js';

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
  targetTag: MediaTargetTag;
}

interface StaticMediaProperty {
  property: string;
  attribute: string;
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
    targetTag: hostInfo.targetTag,
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
): { hostClassName: string; mediaType: 'video' | 'audio'; targetTag: MediaTargetTag } | null {
  let hostClassName: string | undefined;
  let mediaType: 'video' | 'audio' | undefined;
  let targetTag: MediaTargetTag | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node)) return;
    if (!node.name || node.name.text !== className) return;
    if (!node.heritageClauses) return;

    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    const extendsExpr = extendsClause.types[0]!.expression;
    findCustomMediaElement(extendsExpr);
  });

  // Media implementations may put template behavior on a local base class
  // and export a thin mixed-in subclass (VimeoVideo is the real-world case).
  // Each media module owns a single CustomMediaElement composition, so use
  // that composition when it is not directly present in the exported class's
  // extends expression.
  if (!hostClassName || !mediaType || !targetTag) {
    findCustomMediaElement(sourceFile);
  }

  function findCustomMediaElement(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'CustomMediaElement'
    ) {
      if (node.arguments.length >= 2) {
        // First arg: rendered target tag (`video`, `audio`, or `iframe`).
        const tagArg = node.arguments[0]!;
        if (ts.isStringLiteral(tagArg) && ['video', 'audio', 'iframe'].includes(tagArg.text)) {
          targetTag = tagArg.text as MediaTargetTag;
          mediaType = targetTag === 'audio' ? 'audio' : 'video';
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

  if (!hostClassName || !mediaType || !targetTag) return null;
  return { hostClassName, mediaType, targetTag };
}

// ─── Host Property Extraction ───────────────────────────────────────

/**
 * Extract getter/setter pairs from a host class and its ancestors,
 * mirroring what CustomMediaElement does at runtime when it walks
 * the MediaHost prototype chain. Defaults are collected from the
 * `*DefaultProps` exports in every file the walk visits — base files first,
 * then mixins innermost-to-outermost, then the leaf class file — so the
 * most-derived default wins, matching property override semantics.
 */
function extractHostProperties(
  filePath: string,
  hostClassName: string,
  compilerOptions: ts.CompilerOptions,
  nativeNames: Set<string>
): Record<string, HostPropertyDef> {
  const properties: Record<string, HostPropertyDef> = {};
  const visitedFiles: string[] = [];
  extractClassProperties(filePath, hostClassName, properties, compilerOptions, new Set(), nativeNames, visitedFiles);

  const defaults = new Map<string, string>();
  for (const visitedFile of visitedFiles) {
    for (const [name, value] of collectFileDefaults(visitedFile, compilerOptions)) {
      defaults.set(name, value);
    }
  }
  for (const [name, def] of Object.entries(properties)) {
    const value = defaults.get(name);
    if (value !== undefined) def.default = value;
  }

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
  nativeNames: Set<string>,
  visitedFiles: string[]
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
    processExtendsExpression(
      extendsExpr,
      sourceFile,
      filePath,
      properties,
      compilerOptions,
      seen,
      nativeNames,
      visitedFiles
    );
  }

  visitedFiles.push(filePath);
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
  nativeNames: Set<string>,
  visitedFiles: string[]
): void {
  if (ts.isIdentifier(extendsExpr)) {
    const parentClassName = extendsExpr.text;
    if (HOST_BASE_CLASSES.has(parentClassName)) return;
    const parentImportPath = findImportPath(sourceFile, parentClassName);
    if (parentImportPath) {
      const parentFilePath = resolveModuleToFile(filePath, parentImportPath, compilerOptions);
      if (parentFilePath) {
        extractClassProperties(
          parentFilePath,
          parentClassName,
          properties,
          compilerOptions,
          seen,
          nativeNames,
          visitedFiles
        );
      }
    } else {
      // Parent is declared in the same file.
      extractClassProperties(filePath, parentClassName, properties, compilerOptions, seen, nativeNames, visitedFiles);
    }
    return;
  }

  if (ts.isCallExpression(extendsExpr)) {
    const { mixins, base } = unwindMixinChain(extendsExpr);
    // Process the base class first (innermost identifier), then layer each
    // mixin from innermost to outermost so outer mixins override inner ones.
    processExtendsExpression(base, sourceFile, filePath, properties, compilerOptions, seen, nativeNames, visitedFiles);
    for (let i = mixins.length - 1; i >= 0; i--) {
      processMixin(mixins[i]!.name, sourceFile, filePath, properties, compilerOptions, seen, nativeNames, visitedFiles);
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
  nativeNames: Set<string>,
  visitedFiles: string[]
): void {
  const resolved = resolveMixinDeclaration(mixinName, callerSourceFile, callerFilePath, compilerOptions, new Set());
  if (!resolved) return;

  const seenKey = `${resolved.filePath}::mixin::${resolved.name}`;
  if (seen.has(seenKey)) return;
  seen.add(seenKey);

  visitedFiles.push(resolved.filePath);
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
  if (!reExport) {
    // Entry-point barrels (and rolled-up entry .d.ts files, e.g.
    // @videojs/spf/hls → dist/dev/hls.d.ts) import the implementation and
    // re-export it without a module specifier — follow the import binding.
    const importBinding = findImportPath(sourceFile, mixinName);
    if (!importBinding) return undefined;
    const importedFilePath = resolveModuleToFile(mixinFilePath, importBinding, compilerOptions);
    if (!importedFilePath || importedFilePath === mixinFilePath) return undefined;
    const importedVisitKey = `${importedFilePath}::${mixinName}`;
    if (visited.has(importedVisitKey)) return undefined;
    visited.add(importedVisitKey);
    const importedContent = fs.readFileSync(importedFilePath, 'utf-8');
    const importedSourceFile = ts.createSourceFile(importedFilePath, importedContent, ts.ScriptTarget.Latest, true);
    const importedInner = findMixinInnerClass(importedSourceFile, mixinName);
    if (importedInner) {
      return { name: mixinName, filePath: importedFilePath, sourceFile: importedSourceFile, innerClass: importedInner };
    }
    return resolveMixinDeclaration(mixinName, importedSourceFile, importedFilePath, compilerOptions, visited);
  }

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

/**
 * Resolve host property types via the type checker, keyed by property name.
 * Walking own class members only sees explicit annotations, so this reads the
 * class's full instance type — which the checker resolves through the mixin
 * chain — to recover types for unannotated getters (e.g. `get src()` → string).
 */
function resolveInferredTypes(
  hostFilePath: string,
  hostClassName: string,
  program: ts.Program,
  checker: ts.TypeChecker
): Map<string, string> {
  const types = new Map<string, string>();
  const sourceFile = program.getSourceFile(hostFilePath);
  if (!sourceFile) return types;

  let classNode: ts.ClassDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === hostClassName) classNode = node;
    if (!classNode) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!classNode?.name) return types;

  const symbol = checker.getSymbolAtLocation(classNode.name);
  if (!symbol) return types;

  for (const prop of checker.getDeclaredTypeOfSymbol(symbol).getProperties()) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, classNode);
    types.set(prop.name, checker.typeToString(propType));
  }
  return types;
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

// ─── Default Value Extraction ────────────────────────────────────────

const fileDefaultsCache = new Map<string, Map<string, string>>();

/**
 * Collect default values from every `*DefaultProps` object literal exported
 * by a file, in declaration order. Spread entries are resolved through
 * imports (e.g. `{ ...hlsMediaDefaultProps, castSrc: '' }`).
 */
function collectFileDefaults(filePath: string, compilerOptions: ts.CompilerOptions): Map<string, string> {
  const cached = fileDefaultsCache.get(filePath);
  if (cached) return cached;

  const defaults = new Map<string, string>();
  fileDefaultsCache.set(filePath, defaults);
  if (!fs.existsSync(filePath)) return defaults;

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.name.text.endsWith('DefaultProps')) continue;
      if (!decl.initializer) continue;
      const init = unwrapExpression(decl.initializer);
      if (!ts.isObjectLiteralExpression(init)) continue;
      for (const [name, value] of resolveObjectLiteralEntries(init, sourceFile, filePath, compilerOptions, new Set())) {
        defaults.set(name, value);
      }
    }
  });

  return defaults;
}

/**
 * Flatten an object literal into name → serialized value, resolving spreads
 * of identifiers declared in the same file or imported from another file.
 * Entries are processed in source order, so later entries override spreads.
 */
function resolveObjectLiteralEntries(
  objectLiteral: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions,
  visited: Set<string>
): Map<string, string> {
  const entries = new Map<string, string>();

  for (const prop of objectLiteral.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      const value = serializeDefaultValue(prop.initializer, sourceFile, filePath, compilerOptions);
      if (value !== undefined) entries.set(prop.name.text, value);
      continue;
    }

    if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
      const resolved = resolveConstObjectLiteral(prop.expression.text, sourceFile, filePath, compilerOptions);
      if (!resolved) continue;
      const visitKey = `${resolved.filePath}::${prop.expression.text}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      const spreadEntries = resolveObjectLiteralEntries(
        resolved.objectLiteral,
        resolved.sourceFile,
        resolved.filePath,
        compilerOptions,
        visited
      );
      for (const [name, value] of spreadEntries) {
        entries.set(name, value);
      }
    }
  }

  return entries;
}

/**
 * Resolve an identifier to a `const name = { ... }` object literal declared
 * in the same file or in an imported file.
 */
function resolveConstObjectLiteral(
  name: string,
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions
): { objectLiteral: ts.ObjectLiteralExpression; sourceFile: ts.SourceFile; filePath: string } | undefined {
  const local = findConstObjectLiteral(sourceFile, name);
  if (local) return { objectLiteral: local, sourceFile, filePath };

  const importPath = findImportPath(sourceFile, name);
  if (!importPath) return undefined;
  const importedFilePath = resolveModuleToFile(filePath, importPath, compilerOptions);
  if (!importedFilePath || !fs.existsSync(importedFilePath)) return undefined;

  const content = fs.readFileSync(importedFilePath, 'utf-8');
  const importedSourceFile = ts.createSourceFile(importedFilePath, content, ts.ScriptTarget.Latest, true);
  const imported = findConstObjectLiteral(importedSourceFile, name);
  if (!imported) return undefined;
  return { objectLiteral: imported, sourceFile: importedSourceFile, filePath: importedFilePath };
}

function findConstObjectLiteral(sourceFile: ts.SourceFile, name: string): ts.ObjectLiteralExpression | undefined {
  let result: ts.ObjectLiteralExpression | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (result || !ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== name || !decl.initializer) continue;
      const init = unwrapExpression(decl.initializer);
      if (ts.isObjectLiteralExpression(init)) {
        result = init;
        return;
      }
    }
  });
  return result;
}

// `undefined` is deliberately excluded — "default: undefined" conveys nothing
// beyond the table's "—" placeholder.
const LITERAL_IDENTIFIERS = new Set(['NaN', 'Infinity']);

/**
 * Serialize a default value expression for display in the docs:
 *   - Literals (strings, numbers, booleans, null, undefined, NaN) verbatim
 *   - Empty object literals as `{}`, non-empty abbreviated as `{…}`
 *   - Short array literals verbatim, long ones abbreviated as `[…]`
 *   - `Obj.MEMBER` resolved to the member's literal in a `... as const` object
 *   - Anything else is omitted (returns undefined)
 */
function serializeDefaultValue(
  expr: ts.Expression,
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions
): string | undefined {
  const value = unwrapExpression(expr);

  if (
    ts.isStringLiteral(value) ||
    ts.isNoSubstitutionTemplateLiteral(value) ||
    ts.isNumericLiteral(value) ||
    value.kind === ts.SyntaxKind.TrueKeyword ||
    value.kind === ts.SyntaxKind.FalseKeyword ||
    value.kind === ts.SyntaxKind.NullKeyword ||
    ts.isPrefixUnaryExpression(value)
  ) {
    return value.getText(sourceFile);
  }

  if (ts.isIdentifier(value) && LITERAL_IDENTIFIERS.has(value.text)) {
    return value.text;
  }

  if (ts.isObjectLiteralExpression(value)) {
    return value.properties.length === 0 ? '{}' : '{…}';
  }

  if (ts.isArrayLiteralExpression(value)) {
    const text = value.getText(sourceFile);
    return text.length <= 24 ? text : '[…]';
  }

  if (ts.isPropertyAccessExpression(value) && ts.isIdentifier(value.expression) && ts.isIdentifier(value.name)) {
    const resolved = resolveConstObjectLiteral(value.expression.text, sourceFile, filePath, compilerOptions);
    if (!resolved) return undefined;
    for (const prop of resolved.objectLiteral.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === value.name.text) {
        return serializeDefaultValue(prop.initializer, resolved.sourceFile, resolved.filePath, compilerOptions);
      }
    }
    return undefined;
  }

  return undefined;
}

// ─── Shared Data Extraction ──────────────────────────────────────────

/**
 * Extract property-to-attribute mappings from the `static properties` object
 * inside the CustomMediaElement factory. The property name is needed to
 * classify standard attributes separately from Video.js-specific ones.
 */
function extractStaticProperties(filePath: string): StaticMediaProperty[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const properties: StaticMediaProperty[] = [];

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

        properties.push({ property: propName, attribute: attrName });
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return properties;
}

// ─── React Surface Extraction ──────────────────────────────────────

/**
 * Extract the public React surface from the matching media component.
 *
 * Convention:
 *   - `forwardRef<HTML*Element, *Props>` declares the public ref target.
 *   - extending `VideoHTMLAttributes` / `AudioHTMLAttributes` opts into the
 *     native React DOM props.
 *   - the defaults object passed to `useSyncProps` is the runtime source of
 *     truth for Video.js-specific props.
 */
function extractReactReference(
  monorepoRoot: string,
  source: MediaElementSource,
  compilerOptions: ts.CompilerOptions,
  propertyDefinitions: Record<string, HostPropertyDef>
): ReactMediaReference | undefined {
  const mediaDirectory = path.basename(path.dirname(source.mediaFilePath));
  const reactFilePath = path.join(monorepoRoot, 'packages/react/src/media', mediaDirectory, 'index.tsx');
  if (!fs.existsSync(reactFilePath)) return undefined;

  const content = fs.readFileSync(reactFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(reactFilePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const propsInterfaceName = `${source.className}Props`;
  let target: MediaTargetTag | undefined;
  let acceptsNativeProps = false;
  let defaultsName: string | undefined;

  function visit(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node) && node.name.text === propsInterfaceName) {
      acceptsNativeProps =
        node.heritageClauses?.some((clause) =>
          clause.types.some((type) => /(?:Video|Audio)HTMLAttributes/.test(type.getText(sourceFile)))
        ) ?? false;
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === source.className &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'forwardRef'
    ) {
      const refType = node.initializer.typeArguments?.[0]?.getText(sourceFile);
      if (refType === 'HTMLVideoElement') target = 'video';
      if (refType === 'HTMLAudioElement') target = 'audio';
      if (refType === 'HTMLIFrameElement') target = 'iframe';
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useSyncProps' &&
      node.arguments.length >= 3
    ) {
      const defaultsArg = node.arguments[2]!;
      if (ts.isIdentifier(defaultsArg)) defaultsName = defaultsArg.text;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!target) return undefined;

  const props: Record<string, HostPropertyDef> = {};
  if (defaultsName) {
    const resolved = resolveConstObjectLiteral(defaultsName, sourceFile, reactFilePath, compilerOptions);
    if (resolved) {
      const defaultValues = resolveObjectLiteralEntries(
        resolved.objectLiteral,
        resolved.sourceFile,
        resolved.filePath,
        compilerOptions,
        new Set()
      );
      const names = resolveObjectLiteralPropertyNames(
        resolved.objectLiteral,
        resolved.sourceFile,
        resolved.filePath,
        compilerOptions,
        new Set()
      );

      for (const name of [...names].sort()) {
        const definition = propertyDefinitions[name];
        const prop: HostPropertyDef = definition
          ? { ...definition, readonly: false }
          : { type: 'unknown', readonly: false };
        const defaultValue = defaultValues.get(name);
        if (defaultValue !== undefined) prop.default = defaultValue;
        props[name] = prop;
      }
    }
  }

  return { target, acceptsNativeProps, props };
}

/** Collect object-literal keys, including keys whose defaults are not serializable. */
function resolveObjectLiteralPropertyNames(
  objectLiteral: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  compilerOptions: ts.CompilerOptions,
  visited: Set<string>
): Set<string> {
  const names = new Set<string>();

  for (const prop of objectLiteral.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      names.add(prop.name.text);
      continue;
    }

    if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
      const resolved = resolveConstObjectLiteral(prop.expression.text, sourceFile, filePath, compilerOptions);
      if (!resolved) continue;
      const visitKey = `${resolved.filePath}::${prop.expression.text}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      for (const name of resolveObjectLiteralPropertyNames(
        resolved.objectLiteral,
        resolved.sourceFile,
        resolved.filePath,
        compilerOptions,
        visited
      )) {
        names.add(name);
      }
    }
  }

  return names;
}

// ─── Method Extraction ───────────────────────────────────────────────

// Lifecycle methods plus EventTarget/DOM-query plumbing that the host class
// overrides but which aren't part of the native HTMLMediaElement method API the
// docs link to.
const EXCLUDED_METHOD_NAMES = new Set([
  'attach',
  'detach',
  'destroy',
  'addEventListener',
  'removeEventListener',
  'querySelector',
  'querySelectorAll',
]);

/**
 * Collect public instance method names declared directly on a named class.
 * Excludes the constructor, lifecycle methods (attach/detach/destroy),
 * private/protected `_`/`#` names, and accessors (getters/setters are
 * properties, not methods). Returns [] if the file or class isn't found.
 */
function extractPublicMethodNames(filePath: string, className: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  let classNode: ts.ClassDeclaration | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      classNode = node;
    }
  });
  if (!classNode) return [];

  const names: string[] = [];
  for (const member of classNode.members) {
    if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) continue;
    if (
      member.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
      )
    ) {
      continue;
    }
    const name = member.name.text;
    if (name.startsWith('_') || name.startsWith('#')) continue;
    if (EXCLUDED_METHOD_NAMES.has(name)) continue;
    names.push(name);
  }
  return names;
}

/** Merge two method-name lists, dedupe by name, and sort alphabetically. */
function mergeMethodNames(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])].sort();
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
 * style calls and `@fires` JSDoc tags, collecting dispatched event names into `events`
 * and tag descriptions into `fires` (which also acts as an event source — dispatch
 * sites in helper files the walk never visits can be declared via `@fires` alone).
 * Forwarding patterns like `new (event.constructor as ...)(event.type, event)` are
 * naturally skipped because their first argument is not a `StringLiteral`.
 */
function extractDispatchedEvents(
  filePath: string,
  className: string,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>,
  events: Set<string>,
  fires: Map<string, string>
): Set<string> {
  const fileScanKey = `${filePath}::dispatchEvents`;
  if (!seen.has(fileScanKey)) {
    seen.add(fileScanKey);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    scanForDispatchEvents(sourceFile, events);
    scanForFiresTags(sourceFile, fires);

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
        walkExtendsForDispatchEvents(extendsExpr, sourceFile, filePath, compilerOptions, seen, events, fires);
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
  events: Set<string>,
  fires: Map<string, string>
): void {
  if (ts.isIdentifier(extendsExpr)) {
    const parentName = extendsExpr.text;
    if (HOST_BASE_CLASSES.has(parentName)) return;
    const parentImportPath = findImportPath(sourceFile, parentName);
    if (parentImportPath) {
      const parentFilePath = resolveModuleToFile(filePath, parentImportPath, compilerOptions);
      if (parentFilePath) {
        extractDispatchedEvents(parentFilePath, parentName, compilerOptions, seen, events, fires);
      }
    } else {
      extractDispatchedEvents(filePath, parentName, compilerOptions, seen, events, fires);
    }
    return;
  }

  if (ts.isCallExpression(extendsExpr)) {
    const { mixins, base } = unwindMixinChain(extendsExpr);
    walkExtendsForDispatchEvents(base, sourceFile, filePath, compilerOptions, seen, events, fires);
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
      // Follow barrel re-exports so the actual mixin declaration file is
      // scanned (mirrors resolveMixinDeclaration's re-export handling).
      const declaration = resolveMixinDeclaration(mixin.name, sourceFile, filePath, compilerOptions, new Set());
      if (declaration) mixinFilePath = declaration.filePath;
      const key = `${mixinFilePath}::dispatchEvents`;
      if (seen.has(key)) continue;
      seen.add(key);
      const content = fs.readFileSync(mixinFilePath, 'utf-8');
      const mixinSourceFile = ts.createSourceFile(mixinFilePath, content, ts.ScriptTarget.Latest, true);
      scanForDispatchEvents(mixinSourceFile, events);
      scanForFiresTags(mixinSourceFile, fires);
    }
  }
}

/**
 * Collect `@fires name - description` JSDoc tags from a file. The tag may sit
 * on the dispatching class, a mixin function, or the const holding a mixin
 * arrow function.
 */
function scanForFiresTags(sourceFile: ts.SourceFile, fires: Map<string, string>): void {
  function visit(node: ts.Node): void {
    const jsDocNodes = (node as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (jsDocNodes) {
      for (const doc of jsDocNodes) {
        for (const tag of doc.tags ?? []) {
          if (tag.tagName.text !== 'fires') continue;
          const parsed = parseFiresTagComment(tag);
          if (parsed && !fires.has(parsed.name)) {
            fires.set(parsed.name, parsed.description);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function parseFiresTagComment(tag: ts.JSDocTag): { name: string; description: string } | undefined {
  let comment = '';
  if (typeof tag.comment === 'string') {
    comment = tag.comment;
  } else if (tag.comment) {
    comment = tag.comment.map((part) => ('text' in part ? part.text : '')).join('');
  }
  const match = comment.trim().match(/^(\S+)\s*(?:-\s*)?(.*)$/s);
  if (!match) return undefined;
  const [, name, description] = match;
  if (!name) return undefined;
  return { name, description: description?.trim() ?? '' };
}

function scanForDispatchEvents(sourceFile: ts.SourceFile, events: Set<string>): void {
  function visit(node: ts.Node): void {
    if (
      ts.isForOfStatement(node) &&
      ts.isVariableDeclarationList(node.initializer) &&
      ts.isArrayLiteralExpression(node.expression)
    ) {
      const declaration = node.initializer.declarations[0];
      const loopName = declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
      let dispatchesLoopValue = false;

      if (loopName) {
        function findLoopDispatch(child: ts.Node): void {
          if (
            ts.isNewExpression(child) &&
            ts.isIdentifier(child.expression) &&
            child.expression.text === 'Event' &&
            child.arguments?.[0] &&
            ts.isIdentifier(child.arguments[0]) &&
            child.arguments[0].text === loopName
          ) {
            dispatchesLoopValue = true;
          }
          ts.forEachChild(child, findLoopDispatch);
        }
        findLoopDispatch(node.statement);
      }

      if (dispatchesLoopValue) {
        for (const element of node.expression.elements) {
          if (ts.isStringLiteral(element)) events.add(element.text);
        }
      }
    }

    // Adapter implementations commonly use a local `emit` helper to bridge
    // events from a third-party player (for example Vimeo). Literal calls are
    // still an unambiguous declaration of the events the adapter implements.
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'emit' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      events.add(node.arguments[0].text);
    }

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
  const staticProperties = extractStaticProperties(customMediaPath);

  // Extract events from capability contract types
  const mediaTypesPath = path.join(monorepoRoot, 'packages/core/src/core/media/types.ts');
  const videoEvents = fs.existsSync(mediaTypesPath) ? extractEventsFromTypes(mediaTypesPath, 'VideoEvents') : [];
  const audioEvents = fs.existsSync(mediaTypesPath) ? extractEventsFromTypes(mediaTypesPath, 'AudioEvents') : [];

  // Custom Video.js events (e.g. `streamtypechange`, `targetlivewindowchange`)
  // are baked into the VideoEvents/AudioEvents contract via dedicated capability
  // interfaces, but they are NOT native DOM media events — they must never
  // surface in the `native` list (which points readers at MDN). They belong
  // solely to the element-specific bucket, where `@fires` adds them per element
  // that actually exposes the capability.
  const customEventNames = fs.existsSync(mediaTypesPath)
    ? new Set([
        ...extractEventsFromTypes(mediaTypesPath, 'MediaStreamTypeEvents'),
        ...extractEventsFromTypes(mediaTypesPath, 'MediaLiveEvents'),
      ])
    : new Set<string>();

  // Supported native media methods are the public instance methods forwarded
  // from the shared base host classes — extracted ONCE per media type (mirroring
  // how events come from VideoEvents/AudioEvents), not per element. Video adds
  // the video-host methods; audio adds the audio-host methods.
  const mediaHostPath = path.join(monorepoRoot, 'packages/core/src/dom/media/media-host.ts');
  const videoHostPath = path.join(monorepoRoot, 'packages/core/src/dom/media/video-host.ts');
  const audioHostPath = path.join(monorepoRoot, 'packages/core/src/dom/media/audio-host.ts');
  const baseMethods = extractPublicMethodNames(mediaHostPath, 'HTMLMediaElementHost');
  const videoMethods = mergeMethodNames(baseMethods, extractPublicMethodNames(videoHostPath, 'HTMLVideoElementHost'));
  const audioMethods = mergeMethodNames(baseMethods, extractPublicMethodNames(audioHostPath, 'HTMLAudioElementHost'));

  // Extract CSS vars using the existing handler (needs a TS program).
  // Ensure `lib.dom.d.ts` is loaded so HTMLMediaElement / HTMLVideoElement /
  // HTMLAudioElement member names can be resolved for the `overridesNative`
  // tag — `tsconfig.base.json` only lists `ES2022`.
  const programOptions: ts.CompilerOptions = {
    ...compilerOptions,
    lib: dedupeStrings([...(compilerOptions.lib ?? []), 'lib.dom.d.ts']),
  };
  const program = ts.createProgram(
    dedupeStrings([
      customMediaPath,
      mediaHostPath,
      videoHostPath,
      audioHostPath,
      ...sources.map((s) => s.hostFilePath),
    ]),
    programOptions
  );
  const checker = program.getTypeChecker();
  const videoCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Video');
  const audioCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Audio');

  // Collect native HTMLMediaElement/Video/Audio member names from lib.dom.d.ts.
  const customMediaSourceFile = program.getSourceFile(customMediaPath);
  const nativeNames = customMediaSourceFile
    ? collectNativeMemberNames(program, customMediaSourceFile)
    : new Set<string>();

  const baseHostProperties = extractHostProperties(mediaHostPath, 'HTMLMediaElementHost', compilerOptions, nativeNames);
  const videoHostProperties = extractHostProperties(
    videoHostPath,
    'HTMLVideoElementHost',
    compilerOptions,
    nativeNames
  );
  const audioHostProperties = extractHostProperties(
    audioHostPath,
    'HTMLAudioElementHost',
    compilerOptions,
    nativeNames
  );

  function fillInferredTypes(properties: Record<string, HostPropertyDef>, filePath: string, className: string): void {
    const inferredTypes = resolveInferredTypes(filePath, className, program, checker);
    for (const [name, def] of Object.entries(properties)) {
      if (def.type === 'unknown' && inferredTypes.has(name)) {
        def.type = inferredTypes.get(name)!;
      }
    }
  }

  fillInferredTypes(baseHostProperties, mediaHostPath, 'HTMLMediaElementHost');
  fillInferredTypes(videoHostProperties, videoHostPath, 'HTMLVideoElementHost');
  fillInferredTypes(audioHostProperties, audioHostPath, 'HTMLAudioElementHost');

  const videoBaseSurface = { ...baseHostProperties, ...videoHostProperties };
  const audioBaseSurface = { ...baseHostProperties, ...audioHostProperties };

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

  const results: MediaElementResult[] = [];

  for (const source of sources) {
    const hostProperties = extractHostProperties(
      source.hostFilePath,
      source.hostClassName,
      compilerOptions,
      nativeNames
    );

    fillInferredTypes(hostProperties, source.hostFilePath, source.hostClassName);

    const baseSurface =
      source.targetTag === 'video' ? videoBaseSurface : source.targetTag === 'audio' ? audioBaseSurface : {};
    const publicProperties = { ...baseSurface, ...hostProperties };
    const propertyDefinitions: Record<string, HostPropertyDef> = {};
    for (const [name, definition] of Object.entries(baseSurface)) {
      if (!definition.overridesNative) propertyDefinitions[name] = definition;
    }
    Object.assign(propertyDefinitions, hostProperties);

    const standardAttributes: string[] = [];
    const customAttributes: Record<string, HostPropertyDef> = {};
    for (const { property, attribute } of staticProperties) {
      const definition = publicProperties[property];

      if (source.targetTag === 'iframe') {
        // Embed attributes only have media semantics when the synthetic host
        // implements the corresponding property. Unmatched shared attributes
        // are inert because iframe targets do not receive attribute forwarding.
        if (definition) customAttributes[attribute] = { ...definition, readonly: false };
        continue;
      }

      if (definition && !definition.overridesNative) {
        customAttributes[attribute] = { ...definition, readonly: false };
      } else {
        standardAttributes.push(attribute);
      }
    }

    const cssCustomProperties =
      source.targetTag === 'video' ? videoCSSVars : source.targetTag === 'audio' ? audioCSSVars : {};

    // Walk the host's mixin/parent chain collecting `@fires` descriptions. An
    // event is documented as element-specific iff it carries a `@fires` tag —
    // that tag is the authored signal that an event needs a description. Standard
    // DOM events are never tagged, and a tagged event stays documented even when
    // it also lives in the typed media events contract (e.g. streamtypechange).
    const fires = new Map<string, string>();
    const dispatchedEvents = new Set<string>();
    extractDispatchedEvents(
      source.hostFilePath,
      source.hostClassName,
      compilerOptions,
      new Set(),
      dispatchedEvents,
      fires
    );
    const contractEvents = source.mediaType === 'video' ? videoEvents : audioEvents;
    const contractEventNames = new Set(contractEvents);
    const customEventNamesForElement = new Set(fires.keys());
    if (source.targetTag === 'iframe') {
      for (const name of dispatchedEvents) {
        if (!contractEventNames.has(name)) customEventNamesForElement.add(name);
      }
    }
    const customEvents: MediaEventDef[] = [...customEventNamesForElement].sort().map((name) => {
      const def: MediaEventDef = { name };
      const description = fires.get(name);
      if (description) def.description = description;
      return def;
    });

    // The native list points readers at MDN, so it must contain only genuine
    // native DOM events. Exclude (1) element-specific events already surfaced
    // with their own description, and (2) custom Video.js events from the
    // capability interfaces — these are never native, even on elements that
    // don't fire them (e.g. dash-video has no streamType, so streamtypechange
    // appears nowhere).
    const customEventSet = new Set(customEvents.map((event) => event.name));
    const standardEvents = contractEvents.filter(
      (name) =>
        !customEventSet.has(name) &&
        !customEventNames.has(name) &&
        (source.targetTag !== 'iframe' || dispatchedEvents.has(name))
    );

    const baseMethodNames =
      source.targetTag === 'video' ? videoMethods : source.targetTag === 'audio' ? audioMethods : [];
    const methods = mergeMethodNames(
      baseMethodNames,
      extractPublicMethodNames(source.hostFilePath, source.hostClassName)
    );

    const nativeProperties = Object.entries(baseSurface)
      .filter(([name, definition]) => definition.overridesNative && !(name in hostProperties))
      .map(([name]) => name)
      .sort();

    const react = extractReactReference(monorepoRoot, source, compilerOptions, publicProperties);

    const reference: MediaElementReference = {
      name: source.className,
      tagName: source.tagName,
      mediaType: source.mediaType,
      platforms: {
        html: {
          target: source.targetTag,
          attributes: {
            standard: standardAttributes.sort(),
            custom: customAttributes,
          },
          properties: {
            definitions: propertyDefinitions,
            native: nativeProperties,
          },
          events: {
            standard: standardEvents,
            custom: customEvents,
          },
          methods,
          cssCustomProperties,
        },
        ...(react ? { react } : {}),
      },
    };

    results.push({ name: source.className, reference });
  }

  return results;
}
