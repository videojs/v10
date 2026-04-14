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
  compilerOptions: ts.CompilerOptions
): Record<string, HostPropertyDef> {
  const properties: Record<string, HostPropertyDef> = {};
  extractClassProperties(filePath, hostClassName, properties, compilerOptions, new Set());
  return properties;
}

/**
 * Recursively extract getter/setter pairs from a class and its parent chain.
 * Child properties override parent properties (checked via the `seen` set).
 * Stops at host base classes (HTMLMediaElementHost, HTMLVideoElementHost, etc.).
 */
function extractClassProperties(
  filePath: string,
  className: string,
  properties: Record<string, HostPropertyDef>,
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

    // Check for extends clause (host inheritance)
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
  if (parentClassName && !HOST_BASE_CLASSES.has(parentClassName)) {
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
    const def: HostPropertyDef = {
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
            const block = ts.isBlock(innerBody) ? innerBody : undefined;
            if (block) {
              const templateText = extractTemplateString(block);
              if (templateText) {
                parseSlots(templateText, slots);
              }
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
  const audioSlots = extractSlotsFromTemplateFactory(customMediaPath, 'getCommonTemplateHTML');

  const results: MediaElementResult[] = [];

  for (const source of sources) {
    const hostProperties = extractHostProperties(source.hostFilePath, source.hostClassName, compilerOptions);

    // Deduplicate: host props that overlap with native attributes
    const hostAttrNames = new Set<string>();
    for (const propName of Object.keys(hostProperties)) {
      hostAttrNames.add(propName.toLowerCase());
    }
    const nativeAttributes = allAttributes.filter((attr) => !hostAttrNames.has(attr));

    const cssCustomProperties = source.mediaType === 'video' ? videoCSSVars : audioCSSVars;
    const slots = source.mediaType === 'video' ? videoSlots : audioSlots;
    const events = source.mediaType === 'video' ? videoEvents : audioEvents;

    const reference: MediaElementReference = {
      name: source.className,
      tagName: source.tagName,
      hostProperties,
      nativeAttributes,
      events,
      cssCustomProperties,
      slots,
    };

    results.push({ name: source.className, reference });
  }

  return results;
}
