import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import ts from 'typescript';
import { type DiagnosticLocation, diagnosticLocationFromNode } from '../diagnostics';

/**
 * The shape a token module evaluates to: every leaf is a literal string, every
 * branch is a plain object whose keys are property names.
 *
 * Token sources are constrained to a small grammar (imports + plain object
 * literals + spreads + `cn(...)` of string-literal args + dotted access) so we
 * can statically resolve them without running JS — see `loadTokenModule`.
 */
export type TokenValue = string | { readonly [key: string]: TokenValue };

/**
 * Errors thrown when a token source uses syntax outside the supported grammar
 * (function expressions, ternaries, spreads of non-objects, …). Messages
 * include the file + line so consumers can point users at the offending decl.
 */
export class EvaluationError extends Error {
  public readonly diagnosticCode = 'tailwind-evaluation';
  public readonly fileName?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly endLine?: number;
  public readonly endColumn?: number;
  public readonly sourceText?: string;

  constructor(message: string, location?: DiagnosticLocation | undefined) {
    super(message);
    this.name = 'EvaluationError';
    if (location?.file) this.fileName = location.file;
    if (location?.line !== undefined) this.line = location.line;
    if (location?.column !== undefined) this.column = location.column;
    if (location?.endLine !== undefined) this.endLine = location.endLine;
    if (location?.endColumn !== undefined) this.endColumn = location.endColumn;
    if (location?.sourceText) this.sourceText = location.sourceText;
  }
}

/**
 * Parse and evaluate a token module from disk. Returns an object whose keys
 * are the module's named exports and whose values are `TokenValue` trees.
 *
 * Caches per absolute path. Recurses into relative imports.
 */
export function loadTokenModule(absolutePath: string): Record<string, TokenValue> {
  const cached = moduleCache.get(absolutePath);
  if (cached) return cached;

  // Seed the cache with an empty record before recursing so cyclic imports
  // see *something* instead of looping forever. The cycle is only legal if
  // neither side actually reads through to the other during evaluation —
  // the same rule TypeScript applies.
  const exports: Record<string, TokenValue> = {};
  moduleCache.set(absolutePath, exports);

  const source = readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(absolutePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const env = new Map<string, TokenValue>();

  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      processImport(stmt, absolutePath, env);
      continue;
    }
    if (ts.isExportDeclaration(stmt)) {
      processReExport(stmt, absolutePath, exports, env);
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      const isExport = (stmt.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const value = evaluate(decl.initializer, env, absolutePath);
        env.set(decl.name.text, value);
        if (isExport) exports[decl.name.text] = value;
      }
    }
  }

  return exports;
}

const moduleCache = new Map<string, Record<string, TokenValue>>();

/**
 * Reset the module cache. Test-only — production builds run once per process
 * so the cache is effectively immutable.
 */
export function clearTokenModuleCache(): void {
  moduleCache.clear();
}

/* ─────────────────────────────────────────────────────────────────────────
 * Imports
 * ───────────────────────────────────────────────────────────────────────── */

function processImport(stmt: ts.ImportDeclaration, fromFile: string, env: Map<string, TokenValue>): void {
  const specifier = stmt.moduleSpecifier;
  if (!ts.isStringLiteral(specifier)) return;
  const id = specifier.text;
  const clause = stmt.importClause;
  if (!clause) return;

  // Bare specifiers like `@videojs/utils/style` are ignored — we recognize
  // `cn` as a built-in by callee name in `evaluateCall`. Anything else
  // referenced from a token expression must be a relative import to a token
  // module on disk.
  if (!id.startsWith('.')) return;

  const importedPath = resolveRelativeModule(id, fromFile);
  const imported = loadTokenModule(importedPath);

  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    env.set(clause.namedBindings.name.text, imported as TokenValue);
    return;
  }

  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const spec of clause.namedBindings.elements) {
      const sourceName = spec.propertyName?.text ?? spec.name.text;
      const localName = spec.name.text;
      if (!(sourceName in imported)) {
        throw evalError(
          spec,
          fromFile,
          `Module '${importedPath}' has no export '${sourceName}' (imported as '${localName}')`
        );
      }
      env.set(localName, imported[sourceName]!);
    }
  }
}

function processReExport(
  stmt: ts.ExportDeclaration,
  fromFile: string,
  exports: Record<string, TokenValue>,
  env: Map<string, TokenValue>
): void {
  const specifier = stmt.moduleSpecifier;
  if (!specifier || !ts.isStringLiteral(specifier)) return;
  const id = specifier.text;
  if (!id.startsWith('.')) return;

  const importedPath = resolveRelativeModule(id, fromFile);
  const imported = loadTokenModule(importedPath);

  if (!stmt.exportClause) {
    // `export * from './x'` — pull every export through.
    for (const [name, value] of Object.entries(imported)) {
      exports[name] = value;
      env.set(name, value);
    }
    return;
  }

  if (ts.isNamespaceExport(stmt.exportClause)) {
    // `export * as ns from './x'` — bind the imported module's exports as a
    // single namespace object under `ns`.
    const name = stmt.exportClause.name.text;
    exports[name] = imported as TokenValue;
    env.set(name, imported as TokenValue);
    return;
  }

  if (ts.isNamedExports(stmt.exportClause)) {
    for (const spec of stmt.exportClause.elements) {
      const sourceName = spec.propertyName?.text ?? spec.name.text;
      if (!(sourceName in imported)) {
        throw evalError(spec, fromFile, `Module '${importedPath}' has no export '${sourceName}'`);
      }
      const value = imported[sourceName]!;
      exports[spec.name.text] = value;
      env.set(spec.name.text, value);
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Expression evaluation
 * ───────────────────────────────────────────────────────────────────────── */

function evaluate(node: ts.Expression, env: Map<string, TokenValue>, fromFile: string): TokenValue {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isIdentifier(node)) {
    const v = env.get(node.text);
    if (v === undefined) throw evalError(node, fromFile, `Unresolved identifier '${node.text}'`);
    return v;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return evaluatePropertyAccess(node, env, fromFile);
  }
  if (ts.isObjectLiteralExpression(node)) {
    return evaluateObject(node, env, fromFile);
  }
  if (ts.isCallExpression(node)) {
    return evaluateCall(node, env, fromFile);
  }
  if (ts.isArrayLiteralExpression(node)) {
    // Arrays only appear as `cn(...)` arguments. We model them as the
    // space-join of their elements (matching `cn`'s `.flat()` semantics).
    return evaluateArrayParts(node, env, fromFile).join(' ');
  }
  if (ts.isParenthesizedExpression(node)) {
    return evaluate(node.expression, env, fromFile);
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return evaluate(node.expression, env, fromFile);
  }
  throw evalError(node, fromFile, `Unsupported expression: ${ts.SyntaxKind[node.kind]}`);
}

function evaluatePropertyAccess(
  node: ts.PropertyAccessExpression,
  env: Map<string, TokenValue>,
  fromFile: string
): TokenValue {
  const root = evaluate(node.expression, env, fromFile);
  if (typeof root === 'string') {
    throw evalError(node, fromFile, `Cannot read property '${node.name.text}' of a string token`);
  }
  if (!ts.isIdentifier(node.name)) {
    throw evalError(node, fromFile, 'Computed property access is not supported');
  }
  const next = root[node.name.text];
  if (next === undefined) {
    throw evalError(node, fromFile, `Property '${node.name.text}' does not exist on token`);
  }
  return next;
}

function evaluateObject(node: ts.ObjectLiteralExpression, env: Map<string, TokenValue>, fromFile: string): TokenValue {
  const out: Record<string, TokenValue> = {};
  for (const prop of node.properties) {
    if (ts.isSpreadAssignment(prop)) {
      const v = evaluate(prop.expression, env, fromFile);
      if (typeof v === 'string') {
        throw evalError(prop, fromFile, 'Spread of a string token is not supported');
      }
      Object.assign(out, v);
      continue;
    }
    if (ts.isPropertyAssignment(prop)) {
      const key = readPropertyKey(prop.name, fromFile);
      out[key] = evaluate(prop.initializer, env, fromFile);
      continue;
    }
    if (ts.isShorthandPropertyAssignment(prop)) {
      const v = env.get(prop.name.text);
      if (v === undefined) throw evalError(prop, fromFile, `Unresolved identifier '${prop.name.text}'`);
      out[prop.name.text] = v;
      continue;
    }
    throw evalError(prop, fromFile, `Unsupported object property: ${ts.SyntaxKind[prop.kind]}`);
  }
  return out;
}

function readPropertyKey(name: ts.PropertyName, fromFile: string): string {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  throw evalError(name, fromFile, 'Computed property keys are not supported');
}

function evaluateCall(node: ts.CallExpression, env: Map<string, TokenValue>, fromFile: string): TokenValue {
  if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'join') {
    return evaluateArrayJoin(node, env, fromFile);
  }

  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'cn') {
    throw evalError(node, fromFile, 'Only `cn(...)` calls are supported in token expressions');
  }
  const parts: string[] = [];
  for (const arg of node.arguments) {
    const v = evaluate(arg, env, fromFile);
    if (typeof v === 'string') {
      if (v) parts.push(v);
      continue;
    }
    throw evalError(arg, fromFile, 'cn() arguments must be strings or arrays of strings');
  }
  return parts.join(' ');
}

function evaluateArrayJoin(node: ts.CallExpression, env: Map<string, TokenValue>, fromFile: string): TokenValue {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || !ts.isArrayLiteralExpression(callee.expression)) {
    throw evalError(node, fromFile, 'Only array-literal `.join()` calls are supported in token expressions');
  }
  if (node.arguments.length > 1) {
    throw evalError(node, fromFile, 'Array `.join()` in token expressions accepts at most one separator');
  }

  let separator = ',';
  const arg = node.arguments[0];
  if (arg) {
    if (!ts.isStringLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
      throw evalError(arg, fromFile, 'Array `.join()` separator must be a string literal');
    }
    separator = arg.text;
  }

  return evaluateArrayParts(callee.expression, env, fromFile).join(separator);
}

function evaluateArrayParts(node: ts.ArrayLiteralExpression, env: Map<string, TokenValue>, fromFile: string): string[] {
  const parts: string[] = [];
  for (const el of node.elements) {
    const v = evaluate(el, env, fromFile);
    if (typeof v === 'string') {
      if (v) parts.push(v);
      continue;
    }
    throw evalError(node, fromFile, 'Arrays in token expressions must contain strings only');
  }
  return parts;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Module resolution
 * ───────────────────────────────────────────────────────────────────────── */

const MODULE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'] as const;

/** Resolve a relative `./foo` / `../foo` specifier from `fromFile`. */
function resolveRelativeModule(specifier: string, fromFile: string): string {
  const base = isAbsolute(specifier) ? specifier : resolve(dirname(fromFile), specifier);
  for (const ext of MODULE_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  throw new EvaluationError(`Cannot resolve token module '${specifier}' from '${fromFile}'`);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Diagnostics
 * ───────────────────────────────────────────────────────────────────────── */

function evalError(node: ts.Node, fromFile: string, message: string): EvaluationError {
  return new EvaluationError(message, { ...diagnosticLocationFromNode(node), file: fromFile });
}
