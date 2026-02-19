/**
 * Util reference handler — TAE-based auto-discovery.
 *
 * Generates JSON reference files for hooks, controllers, mixins, factories,
 * contexts, selectors, and utilities by scanning package entry points.
 *
 * Exports are included by naming convention or `@public` JSDoc tag:
 *   select* (capital 3rd), use* (capital 3rd), *Controller (class),
 *   create* (function), or any export tagged @public.
 *
 * Extraction routing is determined by export node type:
 *   - Class / *Controller non-function → controller extraction (raw TS AST)
 *   - Non-function → context extraction (type only)
 *   - Function → function extraction (TAE call signatures)
 *
 * 4 Discovery Strategies (run per entry point, in order):
 *
 *   Strategy 1 — TAE on local modules (primary path)
 *     Parses each resolved local module with typescript-api-extractor.
 *
 *   Strategy 2 — TAE on index file (class re-exports)
 *     Parses the entry index file itself to find controllers that are
 *     re-exported but whose source module is separate.
 *
 *   Strategy 3 — Raw TS AST fallback (failed modules)
 *     When TAE fails on a module (e.g., UniqueESSymbol in HTML bundle),
 *     falls back to walking the raw TypeScript AST for exports.
 *
 *   Strategy 4 — Raw TS AST for missed classes
 *     Scans local modules for exported classes that TAE parsed but missed.
 *
 * Overload Collapsing:
 *   When a function has multiple overloads with identical return types,
 *   only the "widest" signature (most parameters) is kept.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { kebabCase } from 'es-toolkit/string';
import * as ts from 'typescript';
import * as tae from 'typescript-api-extractor';
import {
  type ParamDef,
  type ReturnValue,
  type UtilOverload,
  type UtilReference,
  UtilReferenceSchema,
} from '../../../src/types/util-reference.js';
import { formatType, getShortPropType } from './formatter.js';

const PREFIX = '\x1b[35m[api-docs-builder]\x1b[0m';

const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
  success: (...args: unknown[]) => console.log(PREFIX, ...args),
};

// ─── Types ─────────────────────────────────────────────────────────

export interface UtilEntry {
  slug: string;
  data: UtilReference;
  framework: 'react' | 'html' | null;
}

interface EntryPoint {
  index: string;
  framework: 'react' | 'html' | null;
}

// ─── Entry Points ──────────────────────────────────────────────────

const UTIL_ENTRY_POINTS: EntryPoint[] = [
  { index: 'packages/react/src/index.ts', framework: 'react' },
  { index: 'packages/store/src/react/hooks/index.ts', framework: 'react' },
  { index: 'packages/html/src/index.ts', framework: 'html' },
  { index: 'packages/store/src/html/controllers/index.ts', framework: 'html' },
  { index: 'packages/core/src/dom/store/selectors.ts', framework: null },
  { index: 'packages/store/src/core/selector.ts', framework: null },
];

// ─── Phase 1: Resolve Local Modules ───────────────────────────────

function resolveModulePath(fromFile: string, specifier: string): string {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, specifier);

  // Try exact match, then with extensions
  const extensions = ['', '.ts', '.tsx'];
  for (const ext of extensions) {
    const full = resolved + ext;
    if (fs.existsSync(full)) return full;
  }

  // Try index files
  for (const ext of ['.ts', '.tsx']) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fs.existsSync(indexFile)) return indexFile;
  }

  return resolved;
}

function resolveLocalModules(indexPath: string): string[] {
  const sourceFile = ts.createSourceFile(indexPath, fs.readFileSync(indexPath, 'utf-8'), ts.ScriptTarget.Latest, true);

  const localPaths: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('.')) {
        localPaths.push(resolveModulePath(indexPath, specifier));
      }
    }
  });

  return localPaths;
}

// ─── Phase 2: Convention Matching ──────────────────────────────────

function isUtilExport(exportNode: tae.ExportNode): boolean {
  const name = exportNode.name;
  const type = exportNode.type;

  // Skip type-only exports (interfaces, type aliases without runtime value)
  if (type instanceof tae.ObjectNode && !type.typeName) return false;

  // Naming conventions (auto-included)
  if (name.startsWith('select') && name.charAt(6) >= 'A' && name.charAt(6) <= 'Z' && type instanceof tae.FunctionNode) {
    return true;
  }
  if (name.startsWith('use') && name.charAt(3) >= 'A' && name.charAt(3) <= 'Z' && type instanceof tae.FunctionNode) {
    return true;
  }
  if (name.endsWith('Controller') && !(type instanceof tae.FunctionNode)) return true;
  if (name.startsWith('create') && type instanceof tae.FunctionNode) return true;

  // @public tag (for anything else — utilities, contexts, etc.)
  if (exportNode.isPublic(true)) return true;

  return false;
}

// ─── Display Name ──────────────────────────────────────────────────

function getDisplayName(name: string): string {
  if (name.startsWith('create') && name.includes('Mixin')) {
    // createProviderMixin → ProviderMixin
    return name.replace(/^create/, '');
  }
  return name;
}

// ─── Extraction: Functions ─────────────────────────────────────────

function extractFunctionOverloads(exportNode: tae.ExportNode, filePath: string, program: ts.Program): UtilOverload[] {
  const funcType = exportNode.type;
  if (!(funcType instanceof tae.FunctionNode)) return [];

  const signatures = funcType.callSignatures;
  if (signatures.length === 0) return [];

  // Get per-overload JSDoc from raw TS AST
  const overloadDocs = getOverloadDocs(filePath, program, exportNode.name);

  // Filter to meaningful overloads: if return types differ, keep separate
  if (signatures.length > 1) {
    const returnTypes = signatures.map((s) => formatType(s.returnValueType, false));
    const allSame = returnTypes.every((t) => t === returnTypes[0]);

    if (allSame) {
      // Collapse: use the signature with most params
      const widest = signatures.reduce((a, b) => (a.parameters.length >= b.parameters.length ? a : b));
      return [buildOverload(widest, overloadDocs[signatures.indexOf(widest)])];
    }
  }

  return signatures.map((sig, i) => buildOverload(sig, overloadDocs[i]));
}

function buildOverload(sig: tae.CallSignature, doc?: string): UtilOverload {
  const parameters: Record<string, ParamDef> = {};

  for (const param of sig.parameters) {
    const typeStr = formatType(param.type, param.optional);
    const shortType = getShortPropType(param.name, typeStr);

    const entry: ParamDef = { type: typeStr };
    if (shortType !== undefined) entry.shortType = shortType;
    if (param.documentation?.description) entry.description = param.documentation.description;
    if (!param.optional) entry.required = true;

    // Clean undefined fields
    if (entry.shortType === undefined) delete entry.shortType;
    if (entry.description === undefined) delete entry.description;
    if (!entry.required) delete entry.required;

    parameters[param.name] = entry;
  }

  const returnValue = buildReturnValue(sig.returnValueType);
  const overload: UtilOverload = { parameters, returnValue };

  if (doc) overload.description = doc;

  return overload;
}

function buildReturnValue(type: tae.AnyType): ReturnValue {
  const typeStr = formatType(type, false);
  const shortType = getShortPropType('return', typeStr);

  const result: ReturnValue = { type: typeStr };
  if (shortType !== undefined) result.shortType = shortType;

  // Expand object properties as fields
  if (type instanceof tae.ObjectNode && type.properties.length > 0) {
    const fields: Record<string, { type: string; shortType?: string; description?: string }> = {};
    for (const prop of type.properties) {
      const propType = formatType(prop.type, prop.optional);
      const propShort = getShortPropType(prop.name, propType);
      const field: { type: string; shortType?: string; description?: string } = { type: propType };
      if (propShort !== undefined) field.shortType = propShort;
      if (prop.documentation?.description) field.description = prop.documentation.description;
      fields[prop.name] = field;
    }
    result.fields = fields;
  }

  return result;
}

// ─── Extraction: Controllers (Classes via raw TS AST) ──────────────

function extractControllerOverloads(filePath: string, program: ts.Program, className: string): UtilOverload[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  let classDecl: ts.ClassDeclaration | undefined;

  function findClass(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      classDecl = node;
    }
    ts.forEachChild(node, findClass);
  }
  findClass(sourceFile);
  if (!classDecl) return [];

  // Get constructor overloads (declarations without body), falling back to
  // the implementation constructor when there are no overload declarations.
  const overloadDecls: ts.ConstructorDeclaration[] = [];
  let implDecl: ts.ConstructorDeclaration | undefined;

  for (const member of classDecl.members) {
    if (ts.isConstructorDeclaration(member)) {
      if (!member.body) {
        overloadDecls.push(member);
      } else {
        implDecl = member;
      }
    }
  }

  const constructorDecls = overloadDecls.length > 0 ? overloadDecls : implDecl ? [implDecl] : [];
  if (constructorDecls.length === 0) return [];

  // Get public instance members for returnValue.fields
  const fields = extractPublicMembers(classDecl, sourceFile);

  return constructorDecls.map((decl) => {
    const parameters: Record<string, ParamDef> = {};

    for (const param of decl.parameters) {
      if (!ts.isIdentifier(param.name)) continue;
      const name = param.name.text;
      const isOptional = !!param.questionToken || !!param.initializer;

      let typeStr = 'unknown';
      if (param.type) {
        typeStr = param.type.getText(sourceFile);
      }

      const shortType = getShortPropType(name, typeStr);
      const description = getJSDocParamDescription(decl, name);

      const entry: ParamDef = { type: typeStr };
      if (shortType !== undefined) entry.shortType = shortType;
      if (description) entry.description = description;
      if (!isOptional) entry.required = true;
      if (!entry.required) delete entry.required;

      parameters[name] = entry;
    }

    // Build return value with class type and public members
    const returnValue: ReturnValue = {
      type: `${className}<${getClassTypeParams(classDecl!)}>`,
    };

    if (Object.keys(fields).length > 0) {
      returnValue.fields = fields;
    }

    const overload: UtilOverload = { parameters, returnValue };

    // Get overload-specific JSDoc
    const jsDoc = getNodeJSDoc(decl, sourceFile);
    if (jsDoc) overload.description = jsDoc;

    return overload;
  });
}

function extractPublicMembers(
  classDecl: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): Record<string, { type: string; shortType?: string; description?: string }> {
  const fields: Record<string, { type: string; shortType?: string; description?: string }> = {};

  for (const member of classDecl.members) {
    // Skip private, protected, static, constructor
    if (
      member.modifiers?.some(
        (m) =>
          m.kind === ts.SyntaxKind.PrivateKeyword ||
          m.kind === ts.SyntaxKind.ProtectedKeyword ||
          m.kind === ts.SyntaxKind.StaticKeyword
      )
    )
      continue;

    // Skip # private fields
    if (ts.isPropertyDeclaration(member) && ts.isPrivateIdentifier(member.name)) continue;

    // Skip lifecycle methods
    const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined;
    if (!name) continue;
    if (['hostConnected', 'hostDisconnected', 'hostUpdate', 'hostUpdated'].includes(name)) continue;

    if (ts.isGetAccessorDeclaration(member)) {
      const typeStr = member.type ? member.type.getText(sourceFile) : 'unknown';
      const shortType = getShortPropType(name, typeStr);
      const description = getNodeJSDoc(member, sourceFile);

      const field: { type: string; shortType?: string; description?: string } = { type: typeStr };
      if (shortType !== undefined) field.shortType = shortType;
      if (description) field.description = description;

      fields[name] = field;
    } else if (ts.isMethodDeclaration(member) && !member.body) {
      // Public method declaration (without body = overload, but we skip those)
    } else if (ts.isMethodDeclaration(member)) {
      const params = member.parameters
        .map((p) => {
          const pName = ts.isIdentifier(p.name) ? p.name.text : '...';
          const pType = p.type ? p.type.getText(sourceFile) : 'unknown';
          return `${pName}: ${pType}`;
        })
        .join(', ');
      const retType = member.type ? member.type.getText(sourceFile) : 'void';
      const typeStr = `(${params}) => ${retType}`;
      const shortType = getShortPropType(name, typeStr);
      const description = getNodeJSDoc(member, sourceFile);

      const field: { type: string; shortType?: string; description?: string } = { type: typeStr };
      if (shortType !== undefined) field.shortType = shortType;
      if (description) field.description = description;

      fields[name] = field;
    }
  }

  return fields;
}

function getClassTypeParams(classDecl: ts.ClassDeclaration): string {
  if (!classDecl.typeParameters || classDecl.typeParameters.length === 0) return '';
  return classDecl.typeParameters.map((tp) => tp.name.text).join(', ');
}

// ─── Extraction: Context (non-function @public exports) ────────────

function extractContextOverload(exportNode: tae.ExportNode): UtilOverload {
  const typeStr = formatType(exportNode.type, false);

  return {
    parameters: {},
    returnValue: { type: typeStr },
  };
}

// ─── JSDoc Helpers ─────────────────────────────────────────────────

function getOverloadDocs(filePath: string, program: ts.Program, funcName: string): (string | undefined)[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  const docs: (string | undefined)[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === funcName && !node.body) {
      // This is an overload declaration
      docs.push(getNodeJSDoc(node, sourceFile!));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return docs;
}

function getNodeJSDoc(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return undefined;

  const doc = jsDocNodes[0]!;
  if (!doc.comment) return undefined;

  if (typeof doc.comment === 'string') return doc.comment;

  // Handle JSDocComment array
  return doc.comment.map((c: ts.JSDocText | ts.JSDocLink) => ('text' in c ? c.text : '')).join('');
}

function getJSDocParamDescription(node: ts.Node, paramName: string): string | undefined {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return undefined;

  for (const doc of jsDocNodes) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (ts.isJSDocParameterTag(tag) && ts.isIdentifier(tag.name) && tag.name.text === paramName) {
        if (!tag.comment) return undefined;
        if (typeof tag.comment === 'string') return tag.comment;
        return tag.comment.map((c: ts.JSDocText | ts.JSDocLink) => ('text' in c ? c.text : '')).join('');
      }
    }
  }

  return undefined;
}

function hasJSDocTag(node: ts.Node, tagName: string): boolean {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return false;

  for (const doc of jsDocNodes) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === tagName) return true;
    }
  }
  return false;
}

// ─── Raw TS AST: Fallback Discovery ────────────────────────────────

interface RawExportInfo {
  name: string;
  isFunction: boolean;
  isClass: boolean;
  hasPublicTag: boolean;
  description?: string;
  sourceFile: string;
}

function discoverExportsFromRawAST(modulePath: string, program: ts.Program): RawExportInfo[] {
  const sourceFile = program.getSourceFile(modulePath);
  if (!sourceFile) return [];

  const results: RawExportInfo[] = [];

  function visit(node: ts.Node) {
    // Exported function declarations
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      !node.body // overload declaration
    ) {
      const name = node.name.text;
      const jsDoc = getNodeJSDoc(node, sourceFile!);
      const hasPublicTag = hasJSDocTag(node, 'public');

      // Only add if not already in results (first overload wins for the name)
      if (!results.some((r) => r.name === name)) {
        results.push({
          name,
          isFunction: true,
          isClass: false,
          hasPublicTag,
          description: jsDoc,
          sourceFile: modulePath,
        });
      }
    }

    // Exported function with body (single signature)
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.body &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      !results.some((r) => r.name === node.name!.text)
    ) {
      const name = node.name.text;
      const jsDoc = getNodeJSDoc(node, sourceFile!);
      const hasPublicTag = hasJSDocTag(node, 'public');

      results.push({
        name,
        isFunction: true,
        isClass: false,
        hasPublicTag,
        description: jsDoc,
        sourceFile: modulePath,
      });
    }

    // Exported class declarations
    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const name = node.name.text;
      const jsDoc = getNodeJSDoc(node, sourceFile!);

      results.push({
        name,
        isFunction: false,
        isClass: true,
        hasPublicTag: false,
        description: jsDoc,
        sourceFile: modulePath,
      });
    }

    // Exported const/variable declarations
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const jsDoc = getNodeJSDoc(node, sourceFile!);
          const hasPublicTag = hasJSDocTag(node, 'public');

          results.push({
            name: decl.name.text,
            isFunction: false,
            isClass: false,
            hasPublicTag,
            description: jsDoc,
            sourceFile: modulePath,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return results;
}

function isRawUtilExport(info: RawExportInfo): boolean {
  const { name, isFunction, isClass, hasPublicTag } = info;

  if (name.startsWith('select') && name.charAt(6) >= 'A' && name.charAt(6) <= 'Z') return true;
  if (name.startsWith('use') && name.charAt(3) >= 'A' && name.charAt(3) <= 'Z' && isFunction) return true;
  if (name.endsWith('Controller') && isClass) return true;
  if (name.startsWith('create') && isFunction) return true;
  if (hasPublicTag) return true;

  return false;
}

// ─── Raw TS AST: Function Extraction ───────────────────────────────

function extractFunctionOverloadsFromAST(filePath: string, program: ts.Program, funcName: string): UtilOverload[] {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) return [];

  // Collect overload declarations (no body) and implementation (has body)
  const overloadDecls: ts.FunctionDeclaration[] = [];
  let implDecl: ts.FunctionDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === funcName) {
      if (!node.body) {
        overloadDecls.push(node);
      } else {
        implDecl = node;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const decls = overloadDecls.length > 0 ? overloadDecls : implDecl ? [implDecl] : [];
  if (decls.length === 0) return [];

  // Check if return types differ
  if (decls.length > 1) {
    const returnTypes = decls.map((d) => (d.type ? d.type.getText(sourceFile) : 'void'));
    const allSame = returnTypes.every((t) => t === returnTypes[0]);

    if (allSame) {
      // Collapse to widest
      const widest = decls.reduce((a, b) => (a.parameters.length >= b.parameters.length ? a : b));
      return [buildOverloadFromAST(widest, sourceFile)];
    }
  }

  return decls.map((d) => buildOverloadFromAST(d, sourceFile));
}

function buildOverloadFromAST(decl: ts.FunctionDeclaration, sourceFile: ts.SourceFile): UtilOverload {
  const parameters: Record<string, ParamDef> = {};

  for (const param of decl.parameters) {
    if (!ts.isIdentifier(param.name)) continue;
    const name = param.name.text;
    const isOptional = !!param.questionToken || !!param.initializer;

    let typeStr = 'unknown';
    if (param.type) {
      typeStr = param.type.getText(sourceFile);
    }

    const shortType = getShortPropType(name, typeStr);
    const description = getJSDocParamDescription(decl, name);

    const entry: ParamDef = { type: typeStr };
    if (shortType !== undefined) entry.shortType = shortType;
    if (description) entry.description = description;
    if (!isOptional) entry.required = true;
    if (!entry.required) delete entry.required;

    parameters[name] = entry;
  }

  let returnType = 'unknown';
  if (decl.type) {
    returnType = decl.type.getText(sourceFile);
  }

  const returnValue: ReturnValue = { type: returnType };

  // Try to expand return type fields from source if it's an interface/type in the same file
  const fields = extractReturnTypeFields(returnType, sourceFile);
  if (fields && Object.keys(fields).length > 0) {
    returnValue.fields = fields;
  }

  const overload: UtilOverload = { parameters, returnValue };

  const doc = getNodeJSDoc(decl, sourceFile);
  if (doc) overload.description = doc;

  return overload;
}

function extractReturnTypeFields(
  returnType: string,
  sourceFile: ts.SourceFile
): Record<string, { type: string; shortType?: string; description?: string }> | undefined {
  // Extract the base type name (strip generic parameters)
  const match = returnType.match(/^(\w+)/);
  if (!match) return undefined;
  const typeName = match[1]!;

  // Find the interface/type in the same file
  let interfaceDecl: ts.InterfaceDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
      interfaceDecl = node;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (!interfaceDecl) return undefined;

  const fields: Record<string, { type: string; shortType?: string; description?: string }> = {};
  for (const member of interfaceDecl.members) {
    if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name)) continue;

    const name = member.name.text;
    const typeStr = member.type ? member.type.getText(sourceFile) : 'unknown';
    const shortType = getShortPropType(name, typeStr);
    const description = getNodeJSDoc(member, sourceFile);

    const field: { type: string; shortType?: string; description?: string } = { type: typeStr };
    if (shortType !== undefined) field.shortType = shortType;
    if (description) field.description = description;

    fields[name] = field;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

// ─── Discovery Pipeline ────────────────────────────────────────────

function processExport(
  exportNode: tae.ExportNode,
  modulePath: string,
  entryPoint: EntryPoint,
  program: ts.Program,
  seenKeys: Set<string>,
  seenSlugs: Set<string>,
  entries: UtilEntry[]
): void {
  const key = `${entryPoint.framework}:${exportNode.name}`;
  if (seenKeys.has(key)) return;
  if (!isUtilExport(exportNode)) return;

  const displayName = getDisplayName(exportNode.name);

  let slug = kebabCase(displayName);
  if (seenSlugs.has(slug)) {
    if (!entryPoint.framework) {
      log.error(`Framework-agnostic slug collision: ${slug}`);
    }
    slug = `${entryPoint.framework}-${slug}`;
  }
  seenSlugs.add(slug);

  let overloads: UtilOverload[];

  if (exportNode.name.endsWith('Controller') && !(exportNode.type instanceof tae.FunctionNode)) {
    // Controllers use raw TS AST because TAE represents them as ObjectNode
    overloads = extractControllerOverloads(modulePath, program, exportNode.name);
  } else if (!(exportNode.type instanceof tae.FunctionNode)) {
    overloads = [extractContextOverload(exportNode)];
  } else {
    overloads = extractFunctionOverloads(exportNode, modulePath, program);
  }

  if (overloads.length === 0) {
    log.warn(`No overloads extracted for ${exportNode.name}, skipping`);
    return;
  }

  const description = exportNode.documentation?.description;
  const data: UtilReference = {
    name: displayName,
    overloads,
  };

  if (description) data.description = description;

  entries.push({
    slug,
    data,
    framework: entryPoint.framework,
  });

  seenKeys.add(key);
}

function processRawExport(
  info: RawExportInfo,
  entryPoint: EntryPoint,
  program: ts.Program,
  seenKeys: Set<string>,
  seenSlugs: Set<string>,
  entries: UtilEntry[]
): void {
  const key = `${entryPoint.framework}:${info.name}`;
  if (seenKeys.has(key)) return;

  if (!isRawUtilExport(info)) return;

  const displayName = getDisplayName(info.name);

  let slug = kebabCase(displayName);
  if (seenSlugs.has(slug)) {
    if (!entryPoint.framework) {
      log.error(`Framework-agnostic slug collision: ${slug}`);
    }
    slug = `${entryPoint.framework}-${slug}`;
  }
  seenSlugs.add(slug);

  let overloads: UtilOverload[];

  if (info.isClass) {
    overloads = extractControllerOverloads(info.sourceFile, program, info.name);
  } else if (!info.isFunction && !info.isClass) {
    overloads = [{ parameters: {}, returnValue: { type: 'unknown' } }];
  } else {
    overloads = extractFunctionOverloadsFromAST(info.sourceFile, program, info.name);
  }

  if (overloads.length === 0) {
    log.warn(`No overloads extracted for ${info.name} (AST fallback), skipping`);
    return;
  }

  const data: UtilReference = {
    name: displayName,
    overloads,
  };

  if (info.description) data.description = info.description;

  entries.push({
    slug,
    data,
    framework: entryPoint.framework,
  });

  seenKeys.add(key);
}

function discoverUtilExports(monorepoRoot: string, program: ts.Program): UtilEntry[] {
  const entries: UtilEntry[] = [];
  const seenKeys = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const entryPoint of UTIL_ENTRY_POINTS) {
    const indexPath = path.join(monorepoRoot, entryPoint.index);
    if (!fs.existsSync(indexPath)) {
      log.warn(`Entry point not found: ${indexPath}`);
      continue;
    }

    const localModules = resolveLocalModules(indexPath);
    // When the entry point is a leaf module (no re-exports), scan it directly
    const modulesToScan = localModules.length > 0 ? localModules : [indexPath];
    const failedModules: string[] = [];

    // Strategy 1: TAE on local modules — primary path for hooks, factories, mixins,
    // utilities, contexts, and selectors (e.g., usePlayer, createPlayer, selectPlayback)
    for (const modulePath of modulesToScan) {
      if (!fs.existsSync(modulePath)) continue;

      let ast: tae.Module;
      try {
        ast = tae.parseFromProgram(modulePath, program);
      } catch {
        failedModules.push(modulePath);
        continue;
      }

      for (const exportNode of ast.exports) {
        processExport(exportNode, modulePath, entryPoint, program, seenKeys, seenSlugs, entries);
      }
    }

    // Strategy 2: TAE on index file — finds controllers re-exported from the entry
    // (e.g., PlayerController re-exported from packages/html/src/index.ts)
    try {
      const indexAst = tae.parseFromProgram(indexPath, program);
      for (const exportNode of indexAst.exports) {
        // For controllers from the index, find the source module file for extraction
        if (exportNode.name.endsWith('Controller') && !(exportNode.type instanceof tae.FunctionNode)) {
          const sourceModule = findClassSourceModule(exportNode.name, localModules, program);
          if (sourceModule) {
            processExport(exportNode, sourceModule, entryPoint, program, seenKeys, seenSlugs, entries);
          }
        }
      }
    } catch {
      // Index parsing failed (e.g., HTML index with UniqueESSymbol)
    }

    // Strategy 3: Raw TS AST fallback — when TAE fails on a module (e.g., UniqueESSymbol
    // in HTML bundle), walks the raw TypeScript AST for exports
    for (const modulePath of failedModules) {
      const rawExports = discoverExportsFromRawAST(modulePath, program);
      for (const info of rawExports) {
        processRawExport(info, entryPoint, program, seenKeys, seenSlugs, entries);
      }
    }

    // Strategy 4: Raw TS AST for missed classes — catches exported classes that TAE
    // parsed but skipped (e.g., SnapshotController)
    for (const modulePath of localModules) {
      if (!fs.existsSync(modulePath)) continue;

      const rawExports = discoverExportsFromRawAST(modulePath, program);
      for (const info of rawExports) {
        if (!info.isClass) continue;
        processRawExport(info, entryPoint, program, seenKeys, seenSlugs, entries);
      }
    }
  }

  return entries;
}

function findClassSourceModule(className: string, localModules: string[], program: ts.Program): string | undefined {
  for (const modulePath of localModules) {
    const sourceFile = program.getSourceFile(modulePath);
    if (!sourceFile) continue;

    let found = false;
    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node) && node.name?.text === className) {
        found = true;
      }
      if (!found) ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    if (found) return modulePath;
  }
  return undefined;
}

// ─── Program Creation ──────────────────────────────────────────────

function createUtilProgram(monorepoRoot: string): ts.Program {
  const files: string[] = [];

  for (const entryPoint of UTIL_ENTRY_POINTS) {
    const indexPath = path.join(monorepoRoot, entryPoint.index);
    if (!fs.existsSync(indexPath)) continue;

    files.push(indexPath);

    const localModules = resolveLocalModules(indexPath);
    for (const mod of localModules) {
      if (fs.existsSync(mod) && !files.includes(mod)) {
        files.push(mod);
      }
    }
  }

  const tsconfigPath = path.join(monorepoRoot, 'tsconfig.base.json');
  const config = tae.loadConfig(tsconfigPath);
  config.options.rootDir = monorepoRoot;

  return ts.createProgram(files, config.options);
}

// ─── Public API ────────────────────────────────────────────────────

export function getUtilEntries(monorepoRoot: string): UtilEntry[] {
  const program = createUtilProgram(monorepoRoot);
  return discoverUtilExports(monorepoRoot, program);
}

export function generateUtilReferences(outputPath: string, monorepoRoot: string): { success: number; errors: number } {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const entries = getUtilEntries(monorepoRoot);
  let success = 0;
  let errors = 0;

  log.info(`Found ${entries.length} util APIs. Processing...`);

  for (const entry of entries) {
    const dataToValidate: Record<string, unknown> = { ...entry.data };
    if (entry.framework !== null) {
      dataToValidate.frameworks = [entry.framework];
    }

    const validated = UtilReferenceSchema.safeParse(dataToValidate);

    if (!validated.success) {
      log.error(`Schema validation failed for ${entry.data.name} (${entry.slug}):`);
      for (const issue of validated.error.issues) {
        log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      errors++;
      continue;
    }

    const outputFile = path.join(outputPath, `${entry.slug}.json`);
    const json = `${JSON.stringify(validated.data, null, 2)}\n`;
    fs.writeFileSync(outputFile, json);

    log.success(`\u2705 Generated ${path.basename(outputFile)} (${entry.framework ?? 'all'})`);
    success++;
  }

  return { success, errors };
}
