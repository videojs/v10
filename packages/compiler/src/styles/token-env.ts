import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, resolve as resolvePath } from 'node:path';
import ts from 'typescript';
import { loadTokenModule, TokenEvaluationError, type TokenValue } from './token-module';

export type ResolveTokenModule = (specifier: string, fromFile: string) => string | null | undefined;

export interface TokenEnv {
  values: Map<string, TokenValue>;
  namespaces: Set<string>;
  roots: Set<string>;
  hasSource: boolean;
}

/**
 * Discover token imports in a skin source and evaluate each referenced module.
 * Also folds static local className constants into the environment.
 */
export function buildTokenEnv(
  sourcePath: string | undefined,
  tokenModuleResolver?: ResolveTokenModule | undefined
): TokenEnv {
  const env: TokenEnv = {
    values: new Map<string, TokenValue>(),
    namespaces: new Set<string>(),
    roots: new Set<string>(),
    hasSource: false,
  };
  if (!sourcePath || !existsSync(sourcePath)) return env;
  env.hasSource = true;

  const source = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const specifier = stmt.moduleSpecifier;
    if (!ts.isStringLiteral(specifier)) continue;
    const id = specifier.text;
    const absolutePath = resolveTokenImport(id, sourcePath, tokenModuleResolver);
    if (!absolutePath) continue;

    let exports: Record<string, TokenValue>;
    try {
      exports = loadTokenModule(absolutePath);
    } catch (error) {
      if (error instanceof TokenEvaluationError) continue;
      throw error;
    }

    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const spec of clause.namedBindings.elements) {
        const sourceName = spec.propertyName?.text ?? spec.name.text;
        const localName = spec.name.text;
        const value = exports[sourceName];
        if (value !== undefined) {
          setTokenValue(env, localName, value);
          if (isTokenNamespaceImport(sourceName, localName, value)) env.namespaces.add(localName);
        }
      }
      continue;
    }

    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      env.namespaces.add(clause.namedBindings.name.text);
      setTokenValue(env, clause.namedBindings.name.text, exports as TokenValue);
    }
  }

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const value = tryEvaluateLocal(decl.initializer, env.values);
      if (value !== null) setTokenValue(env, decl.name.text, value);
    }
  }

  return env;
}

/** Resolve a dotted token path like `styles.button.icon` to a utility string. */
export function resolveTokenPath(path: readonly string[], env: Map<string, TokenValue>): string | null {
  if (path.length === 0) return null;
  const [head, ...rest] = path;
  const root = env.get(head!);
  if (root === undefined) return null;

  let cursor: TokenValue = root;
  for (const key of rest) {
    if (typeof cursor === 'string') return null;
    const next = cursor[key];
    if (next === undefined) return null;
    cursor = next;
  }
  return typeof cursor === 'string' ? cursor : null;
}

function setTokenValue(env: TokenEnv, name: string, value: TokenValue): void {
  env.values.set(name, value);
  env.roots.add(name);
}

function isTokenNamespaceImport(sourceName: string, localName: string, value: TokenValue): boolean {
  if (typeof value === 'string') return false;
  return sourceName === 'tokens' || sourceName === 'styles' || localName === 'tokens' || localName === 'styles';
}

function tryEvaluateLocal(node: ts.Expression, env: Map<string, TokenValue>): TokenValue | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isIdentifier(node)) {
    const v = env.get(node.text);
    return v ?? null;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const root = tryEvaluateLocal(node.expression, env);
    if (root === null || typeof root === 'string') return null;
    if (!ts.isIdentifier(node.name)) return null;
    const next = root[node.name.text];
    return next ?? null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const parts: string[] = [];
    for (const item of node.elements) {
      if (ts.isSpreadElement(item)) return null;
      const v = tryEvaluateLocal(item, env);
      if (v === null || typeof v !== 'string') return null;
      if (v) parts.push(v);
    }
    return parts.join(' ');
  }
  if (ts.isParenthesizedExpression(node)) return tryEvaluateLocal(node.expression, env);
  return null;
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'] as const;

function resolveTokenImport(
  specifier: string,
  fromFile: string,
  tokenModuleResolver?: ResolveTokenModule | undefined
): string | null {
  if (specifier.startsWith('.')) return resolveModulePath(specifier, fromFile);
  const resolved = tokenModuleResolver?.(specifier, fromFile);
  if (!resolved) return null;
  return isAbsolute(resolved) ? resolved : resolvePath(dirname(fromFile), resolved);
}

function resolveModulePath(specifier: string, fromFile: string): string | null {
  const base = isAbsolute(specifier) ? specifier : resolvePath(dirname(fromFile), specifier);
  if (extname(base) && existsSync(base)) return base;
  for (const ext of MODULE_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
