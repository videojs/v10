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
 *   - Exclusion: container.ts excluded (re-exports, doesn't declare class inline)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import { extractCSSVars } from './css-vars-handler.js';
import type { MediaElementReference, MediaElementResult } from './pipeline.js';

// ─── Types ───────────────────────────────────────────────────────────

interface MediaElementSource {
  /** File path to the define/media/*.ts file */
  defineFilePath: string;
  /** Class name from the define file (e.g., HlsVideoElement) */
  className: string;
  /** Tag name from static tagName (e.g., 'hls-video') */
  tagName: string;
  /** File path to the media element implementation (e.g., media/hls-video/index.ts) */
  mediaFilePath: string;
  /** File path to the delegate class source */
  delegateFilePath: string;
  /** Name of the delegate class (e.g., HlsMediaDelegate) */
  delegateClassName: string;
  /** Name of the base class from CustomMediaMixin (e.g., HlsCustomMedia) — determines video vs audio */
  customMediaClassName: string;
}

// ─── Discovery ───────────────────────────────────────────────────────

/**
 * Scan define/media/ for files that declare a class inline with static tagName.
 * Container.ts is excluded because it re-exports a class rather than declaring one.
 */
function discoverMediaElements(monorepoRoot: string): MediaElementSource[] {
  const defineDir = path.join(monorepoRoot, 'packages/html/src/define/media');
  if (!fs.existsSync(defineDir)) return [];

  const files = fs.readdirSync(defineDir).filter((f) => f.endsWith('.ts'));
  const sources: MediaElementSource[] = [];

  for (const file of files) {
    const filePath = path.join(defineDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const result = parseDefineFile(sourceFile, filePath, monorepoRoot);
    if (result) {
      sources.push(result);
    }
  }

  return sources;
}

/**
 * Parse a define/media file to extract class name, tagName, and import chain.
 * Returns null if the file doesn't declare an inline class with static tagName
 * (i.e., container.ts which only re-exports).
 */
function parseDefineFile(sourceFile: ts.SourceFile, filePath: string, monorepoRoot: string): MediaElementSource | null {
  let className: string | undefined;
  let tagName: string | undefined;
  let baseClassName: string | undefined;
  let baseImportPath: string | undefined;

  ts.forEachChild(sourceFile, (node) => {
    // Look for: export class FooElement extends Bar { static readonly tagName = '...'; }
    if (!ts.isClassDeclaration(node) || !node.name) return;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;

    // Must have an extends clause
    if (!node.heritageClauses) return;
    const extendsClause = node.heritageClauses.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    if (!extendsClause || extendsClause.types.length === 0) return;

    // Find static tagName
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

  // Resolve relative import to absolute path
  const mediaFilePath = resolveImportPath(filePath, baseImportPath);
  if (!mediaFilePath || !fs.existsSync(mediaFilePath)) return null;

  // Now parse the media element file to find the delegate class
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

  const delegateFilePath = resolveImportPath(mediaFilePath, delegateImportPath);
  if (!delegateFilePath || !fs.existsSync(delegateFilePath)) return null;

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

/**
 * Strip 'Element' suffix from the define class name to get the display name.
 * e.g., HlsVideoElement → HlsVideo, SimpleVideoElement → SimpleVideo
 */
function stripElementSuffix(name: string): string {
  return name.endsWith('Element') ? name.slice(0, -'Element'.length) : name;
}

/**
 * Parse the media element class to find the MediaPropsMixin(Base, Delegate) call.
 * Returns the delegate class name and the custom media base class name.
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

    // Walk the extends expression to find MediaPropsMixin(Base, Delegate)
    const extendsExpr = extendsClause.types[0]!.expression;
    findMediaPropsMixin(extendsExpr, sourceFile);
  });

  function findMediaPropsMixin(node: ts.Node, sf: ts.SourceFile): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'MediaPropsMixin') {
      if (node.arguments.length >= 2) {
        // Second argument is the delegate class
        const delegateArg = node.arguments[1]!;
        if (ts.isIdentifier(delegateArg)) {
          delegateClassName = delegateArg.text;
        }

        // First argument contains the custom media base — unwrap MediaAttachMixin(X)
        const baseArg = node.arguments[0]!;
        customMediaClassName = unwrapMixinBase(baseArg, sf);
      }
      return;
    }

    ts.forEachChild(node, (child) => findMediaPropsMixin(child, sf));
  }

  if (!delegateClassName || !customMediaClassName) return null;
  return { delegateClassName, customMediaClassName };
}

/**
 * Unwrap nested mixin calls to find the innermost base class.
 * e.g., MediaAttachMixin(HlsCustomMedia) → 'HlsCustomMedia'
 */
function unwrapMixinBase(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isCallExpression(node) && node.arguments.length > 0) {
    return unwrapMixinBase(node.arguments[0]!, sourceFile);
  }
  return undefined;
}

// ─── Delegate Property Extraction ────────────────────────────────────

interface DelegateProperty {
  type: string;
  description?: string;
  readonly: boolean;
}

/**
 * Extract getter/setter pairs from a delegate class, mirroring what
 * buildAttrPropMap() in media-props-mixin.ts does at runtime.
 */
function extractDelegateProperties(filePath: string, delegateClassName: string): Record<string, DelegateProperty> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const properties: Record<string, DelegateProperty> = {};

  // Track which properties have getters and/or setters
  const getters = new Map<string, { type: string; description?: string }>();
  const setters = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name || node.name.text !== delegateClassName) return;

    for (const member of node.members) {
      if (!ts.isGetAccessorDeclaration(member) && !ts.isSetAccessorDeclaration(member)) continue;
      if (!member.name || !ts.isIdentifier(member.name)) continue;

      const name = member.name.text;

      // Skip private/underscore-prefixed properties
      if (name.startsWith('_') || name.startsWith('#')) continue;

      // Skip Delegate interface methods (attach, detach, destroy, load, etc.)
      if (['attach', 'detach', 'destroy', 'load', 'target'].includes(name)) continue;

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

  // Build property map from getters (only properties with getters are visible)
  for (const [name, info] of getters) {
    properties[name] = {
      type: info.type,
      readonly: !setters.has(name),
    };
    if (info.description) {
      properties[name]!.description = info.description;
    }
  }

  return properties;
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
 * Read the Attributes array from custom-media-element/index.ts.
 */
function extractStringArray(filePath: string, varName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const items: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== varName) continue;
      if (!decl.initializer) continue;

      // Unwrap `as const`
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

/**
 * Parse <slot> elements from a template function's return string.
 */
function extractSlotsFromTemplate(filePath: string, templateFnName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const slots: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name?.text === templateFnName && node.body) {
      // Find the template literal in the return statement
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
    // Reconstruct template with placeholders replaced by empty strings
    let text = node.head.text;
    for (const span of node.templateSpans) {
      text += span.literal.text;
    }
    return text;
  }
  return undefined;
}

function parseSlots(html: string, slots: string[]): void {
  // Match <slot> and <slot name="...">
  const slotRegex = /<slot(?:\s+name="([^"]*)")?[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = slotRegex.exec(html)) !== null) {
    const name = match[1] ?? '';
    slots.push(name);
  }
}

/**
 * Determine whether a CustomMedia base class is video or audio
 * by tracing imports back to CustomVideoElement or CustomAudioElement.
 */
function resolveMediaType(
  mediaFilePath: string,
  customMediaClassName: string,
  monorepoRoot: string
): 'video' | 'audio' {
  const content = fs.readFileSync(mediaFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(mediaFilePath, content, ts.ScriptTarget.Latest, true);

  // Check if the customMediaClassName is imported and trace to its origin
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

  if (!importSource) return 'video'; // default fallback

  // Resolve and read the source to find what CustomVideoElement/CustomAudioElement is used
  const resolvedPath = resolveImportPath(mediaFilePath, importSource);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) return 'video';

  const delegateContent = fs.readFileSync(resolvedPath, 'utf-8');
  const delegateSourceFile = ts.createSourceFile(resolvedPath, delegateContent, ts.ScriptTarget.Latest, true);

  // Look for class X extends DelegateMixin(CustomVideoElement, ...) or CustomAudioElement
  let mediaType: 'video' | 'audio' = 'video';
  ts.forEachChild(delegateSourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || node.name?.text !== customMediaClassName) return;
    const text = node.getText(delegateSourceFile);
    if (text.includes('CustomAudioElement')) {
      mediaType = 'audio';
    }
  });

  return mediaType;
}

// ─── Utilities ───────────────────────────────────────────────────────

function resolveImportPath(fromFile: string, importSpecifier: string): string | undefined {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importSpecifier);

  // Try direct .ts
  if (fs.existsSync(`${resolved}.ts`)) return `${resolved}.ts`;
  // Try index.ts
  if (fs.existsSync(path.join(resolved, 'index.ts'))) return path.join(resolved, 'index.ts');
  // Try as-is (already has extension)
  if (fs.existsSync(resolved)) return resolved;

  return undefined;
}

// ─── Pipeline ────────────────────────────────────────────────────────

export function generateMediaElementReferences(monorepoRoot: string): MediaElementResult[] {
  const sources = discoverMediaElements(monorepoRoot);
  if (sources.length === 0) return [];

  const customMediaPath = path.join(monorepoRoot, 'packages/core/src/dom/media/custom-media-element/index.ts');

  if (!fs.existsSync(customMediaPath)) return [];

  // Read shared data
  const allAttributes = extractStringArray(customMediaPath, 'Attributes');
  const allEvents = extractStringArray(customMediaPath, 'Events');

  // Extract CSS vars using the existing handler (needs a TS program)
  const tsconfigPath = path.join(monorepoRoot, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);
  config.options.rootDir = monorepoRoot;
  const program = ts.createProgram([customMediaPath], config.options);

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
    // Extract delegate properties
    const delegateProperties = extractDelegateProperties(source.delegateFilePath, source.delegateClassName);

    // Determine video vs audio
    const mediaType = resolveMediaType(source.mediaFilePath, source.customMediaClassName, monorepoRoot);

    // Deduplicate: delegate props that overlap with native Attributes
    const delegatePropNames = new Set(Object.keys(delegateProperties));
    // Also check kebab-case versions of delegate props
    const delegateAttrNames = new Set<string>();
    for (const propName of delegatePropNames) {
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
