/**
 * Media element reference extraction.
 *
 * Discovers media elements from packages/html/src/define/media/*.ts and extracts
 * delegate properties, shared attributes/events/CSS vars, and slots.
 *
 * Convention:
 *   - Define files: packages/html/src/define/media/*.ts with inline class + static tagName
 *   - Media element classes: packages/html/src/media/{name}/index.ts
 *     composed as MediaPropsMixin(MediaAttachMixin(CustomMedia), Delegate)
 *   - Delegate classes: packages/core/src/dom/media/{name}/index.ts with getter/setter pairs
 *   - Shared data: packages/core/src/dom/media/custom-media-element/index.ts
 *     exports Attributes, Events, VideoCSSVars, AudioCSSVars, and template functions
 *   - Slots: parsed from getVideoTemplateHTML / getAudioTemplateHTML in custom-media-element
 *
 * Exclusions (elements discovered but intentionally skipped):
 *   - container.ts: re-exports a class, doesn't declare one inline → no static tagName found
 *   - background-video.ts: uses MediaAttachMixin(HTMLElement) without MediaPropsMixin →
 *     parseMixinChain returns null. Its API reference is manually maintained in MDX.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCSSVars } from './css-vars-handler.js';
import type { DelegatePropertyDef, MediaElementReference, MediaElementResult } from './pipeline.js';

// ─── Types ───────────────────────────────────────────────────────────

interface MediaElementSource {
  defineFilePath: string;
  className: string;
  tagName: string;
  mediaFilePath: string;
  delegateFilePath: string;
  delegateClassName: string;
  customMediaClassName: string;
}

// ─── Module Resolution ───────────────────────────────────────────────

/**
 * Resolve an import specifier to an absolute file path using TypeScript's
 * module resolution. Handles both relative paths and workspace package
 * imports (e.g., @videojs/core/dom/media/hls) via the project's tsconfig.
 */
function resolveModuleToFile(
  fromFile: string,
  importSpecifier: string,
  compilerOptions: ts.CompilerOptions
): string | undefined {
  const result = ts.resolveModuleName(importSpecifier, fromFile, compilerOptions, ts.sys);
  return result.resolvedModule?.resolvedFileName;
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
 * (container.ts) or if the class doesn't use MediaPropsMixin (background-video.ts).
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

  // Parse the media element file to find the delegate class
  const mediaContent = fs.readFileSync(mediaFilePath, 'utf-8');
  const mediaSourceFile = ts.createSourceFile(mediaFilePath, mediaContent, ts.ScriptTarget.Latest, true);

  const delegateInfo = parseMixinChain(mediaSourceFile, baseClassName);
  if (!delegateInfo) return null;

  // Resolve delegate import path
  let delegateImportPath: string | undefined;
  ts.forEachChild(mediaSourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const importClause = node.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;

    for (const specifier of importClause.namedBindings.elements) {
      if (specifier.name.text === delegateInfo.delegateClassName) {
        delegateImportPath = node.moduleSpecifier.text;
        break;
      }
    }
  });

  if (!delegateImportPath) return null;

  const delegateFilePath = resolveModuleToFile(mediaFilePath, delegateImportPath, compilerOptions);
  if (!delegateFilePath) return null;

  return {
    defineFilePath: filePath,
    className: stripElementSuffix(className),
    tagName,
    mediaFilePath,
    delegateFilePath,
    delegateClassName: delegateInfo.delegateClassName,
    customMediaClassName: delegateInfo.customMediaClassName,
  };
}

function stripElementSuffix(name: string): string {
  return name.endsWith('Element') ? name.slice(0, -'Element'.length) : name;
}

/**
 * Parse the media element class to find the MediaPropsMixin(Base, Delegate) call.
 * Returns null for elements that don't use MediaPropsMixin (e.g., BackgroundVideo).
 */
function parseMixinChain(
  sourceFile: ts.SourceFile,
  className: string
): { delegateClassName: string; customMediaClassName: string } | null {
  let delegateClassName: string | undefined;
  let customMediaClassName: string | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node)) return;
    if (!node.name || node.name.text !== className) return;
    if (!node.heritageClauses) return;

    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    const extendsExpr = extendsClause.types[0]!.expression;
    findMediaPropsMixin(extendsExpr);
  });

  function findMediaPropsMixin(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'MediaPropsMixin') {
      if (node.arguments.length >= 2) {
        const delegateArg = node.arguments[1]!;
        if (ts.isIdentifier(delegateArg)) {
          delegateClassName = delegateArg.text;
        }
        const baseArg = node.arguments[0]!;
        customMediaClassName = unwrapMixinBase(baseArg);
      }
      return;
    }
    ts.forEachChild(node, findMediaPropsMixin);
  }

  if (!delegateClassName || !customMediaClassName) return null;
  return { delegateClassName, customMediaClassName };
}

function unwrapMixinBase(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isCallExpression(node) && node.arguments.length > 0) {
    return unwrapMixinBase(node.arguments[0]!);
  }
  return undefined;
}

// ─── Delegate Property Extraction ────────────────────────────────────

/**
 * Extract getter/setter pairs from a delegate class and its ancestors,
 * mirroring what buildAttrPropMap() in media-props-mixin.ts does at runtime.
 */
function extractDelegateProperties(
  filePath: string,
  delegateClassName: string,
  compilerOptions: ts.CompilerOptions
): Record<string, DelegatePropertyDef> {
  const properties: Record<string, DelegatePropertyDef> = {};
  extractClassProperties(filePath, delegateClassName, properties, compilerOptions, new Set());
  return properties;
}

/**
 * Recursively extract getter/setter pairs from a class and its parent chain.
 * Child properties override parent properties (checked via the `seen` set).
 */
function extractClassProperties(
  filePath: string,
  className: string,
  properties: Record<string, DelegatePropertyDef>,
  compilerOptions: ts.CompilerOptions,
  seen: Set<string>
): void {
  if (seen.has(`${filePath}:${className}`)) return;
  seen.add(`${filePath}:${className}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const getters = new Map<string, { type: string; description?: string }>();
  const setters = new Set<string>();
  let parentClassName: string | undefined;
  let parentImportPath: string | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name || node.name.text !== className) return;

    // Check for extends clause (delegate inheritance)
    if (node.heritageClauses) {
      const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
      if (extendsClause && extendsClause.types.length > 0) {
        const extendsExpr = extendsClause.types[0]!.expression;
        if (ts.isIdentifier(extendsExpr)) {
          parentClassName = extendsExpr.text;
        }
      }
    }

    for (const member of node.members) {
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
  });

  // Resolve parent class and extract its properties first (child overrides parent)
  if (parentClassName && parentClassName !== 'EventTarget') {
    // Find the import for the parent class
    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) return;
      if (!ts.isStringLiteral(node.moduleSpecifier)) return;
      const importClause = node.importClause;
      if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;

      for (const specifier of importClause.namedBindings.elements) {
        const importedName = (specifier.propertyName ?? specifier.name).text;
        if (importedName === parentClassName) {
          parentImportPath = node.moduleSpecifier.text;
          break;
        }
      }
    });

    if (parentImportPath) {
      const parentFilePath = resolveModuleToFile(filePath, parentImportPath, compilerOptions);
      if (parentFilePath) {
        // Extract parent properties first — child will override
        extractClassProperties(parentFilePath, parentClassName, properties, compilerOptions, seen);
      }
    } else {
      // Parent is in the same file
      extractClassProperties(filePath, parentClassName, properties, compilerOptions, seen);
    }
  }

  // Apply this class's properties (overrides parent)
  for (const [name, info] of getters) {
    const def: DelegatePropertyDef = {
      type: info.type,
      readonly: !setters.has(name),
    };
    if (info.description) def.description = info.description;
    properties[name] = def;
  }
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

function extractStringArray(filePath: string, varName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const items: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== varName) continue;
      if (!decl.initializer) continue;

      let expr = decl.initializer;
      if (ts.isAsExpression(expr)) expr = expr.expression;

      if (ts.isArrayLiteralExpression(expr)) {
        for (const el of expr.elements) {
          if (ts.isStringLiteral(el)) {
            items.push(el.text);
          }
        }
      }
    }
  });

  return items;
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

/**
 * Determine whether a CustomMedia base class is video or audio by checking
 * the extends clause of the class that defines it (e.g., DelegateMixin(CustomVideoElement, ...)).
 */
function resolveMediaType(
  mediaFilePath: string,
  customMediaClassName: string,
  compilerOptions: ts.CompilerOptions
): 'video' | 'audio' {
  const content = fs.readFileSync(mediaFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(mediaFilePath, content, ts.ScriptTarget.Latest, true);

  let importSource: string | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const importClause = node.importClause;
    if (!importClause?.namedBindings || !ts.isNamedImports(importClause.namedBindings)) return;

    for (const specifier of importClause.namedBindings.elements) {
      if (specifier.name.text === customMediaClassName) {
        importSource = node.moduleSpecifier.text;
        break;
      }
    }
  });

  // Fallback: default to video (all current media elements are video-based)
  if (!importSource) return 'video';

  const resolvedPath = resolveModuleToFile(mediaFilePath, importSource, compilerOptions);
  if (!resolvedPath) return 'video';

  const sourceContent = fs.readFileSync(resolvedPath, 'utf-8');
  const resolvedSourceFile = ts.createSourceFile(resolvedPath, sourceContent, ts.ScriptTarget.Latest, true);

  // Check the extends clause for CustomAudioElement specifically
  let mediaType: 'video' | 'audio' = 'video';
  ts.forEachChild(resolvedSourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || node.name?.text !== customMediaClassName) return;
    if (!node.heritageClauses) return;

    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    // Walk the extends expression looking for CustomAudioElement identifier
    function checkForAudio(n: ts.Node): void {
      if (ts.isIdentifier(n) && n.text === 'CustomAudioElement') {
        mediaType = 'audio';
        return;
      }
      ts.forEachChild(n, checkForAudio);
    }
    checkForAudio(extendsClause.types[0]!.expression);
  });

  return mediaType;
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
  const allAttributes = extractStringArray(customMediaPath, 'Attributes');
  const allEvents = extractStringArray(customMediaPath, 'Events');

  // Extract CSS vars using the existing handler (needs a TS program)
  const program = ts.createProgram([customMediaPath], compilerOptions);
  const videoCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Video');
  const audioCSSVarsRaw = extractCSSVars(customMediaPath, program, 'Audio');

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
  const audioSlots = extractSlotsFromTemplate(customMediaPath, 'getAudioTemplateHTML');

  const results: MediaElementResult[] = [];

  for (const source of sources) {
    const delegateProperties = extractDelegateProperties(
      source.delegateFilePath,
      source.delegateClassName,
      compilerOptions
    );

    const mediaType = resolveMediaType(source.mediaFilePath, source.customMediaClassName, compilerOptions);

    // Deduplicate: delegate props that overlap with native Attributes
    const delegateAttrNames = new Set<string>();
    for (const propName of Object.keys(delegateProperties)) {
      delegateAttrNames.add(propName.toLowerCase());
    }
    const nativeAttributes = allAttributes.filter((attr) => !delegateAttrNames.has(attr));

    const cssCustomProperties = mediaType === 'video' ? videoCSSVars : audioCSSVars;
    const slots = mediaType === 'video' ? videoSlots : audioSlots;

    const reference: MediaElementReference = {
      name: source.className,
      tagName: source.tagName,
      delegateProperties,
      nativeAttributes,
      events: [...allEvents],
      cssCustomProperties,
      slots,
    };

    results.push({ name: source.className, reference });
  }

  return results;
}
