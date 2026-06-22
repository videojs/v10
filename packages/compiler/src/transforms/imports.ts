import { dirname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/**
 * Per-identifier rewrite target. `source` may be either a bare specifier
 * (`@fixture/icons/jsx`) or a relative path. Relative paths are resolved
 * against the configured `configDir` and re-projected as a relative path from
 * the output file at print time.
 */
export interface ImportRef {
  source: string;
  name: string;
}

/**
 * Rewrite rule for a given source module.
 * - `string`: rewrite the module specifier; identifier names pass through.
 * - function: per-identifier full power. Receives the imported name; returns
 *   the target `{ source, name }`.
 */
export type ImportRule = string | ((name: string) => ImportRef);

export interface ImportRewriteOptions {
  /** Map: original module specifier → rewrite rule. */
  rules: Record<string, ImportRule>;
  /** Directory that relative `source` values in rules resolve against (typically the compiler.config.js dir). */
  configDir?: string | undefined;
  /** Output file path (used to project relative-path rules into a relative import). */
  outputFile?: string | undefined;
}

/**
 * TS transformer that rewrites `import { X } from 'oldSource'` into one or
 * more imports per the rule for `oldSource`. If the rule is a function it
 * may map each identifier to a different `{ source, name }`, in which case
 * one `import` statement is emitted per unique resolved source.
 */
export function transformImports(options: ImportRewriteOptions): ts.TransformerFactory<ts.SourceFile> {
  const { rules } = options;
  return (context) => {
    return (sourceFile) => {
      const newStatements: ts.Statement[] = [];
      for (const stmt of sourceFile.statements) {
        const rewritten = rewriteImportStatement(stmt, rules, options, context.factory);
        if (rewritten === null) {
          newStatements.push(stmt);
          continue;
        }
        newStatements.push(...rewritten);
      }
      return context.factory.updateSourceFile(sourceFile, newStatements);
    };
  };
}

function rewriteImportStatement(
  stmt: ts.Statement,
  rules: Record<string, ImportRule>,
  options: ImportRewriteOptions,
  factory: ts.NodeFactory
): ts.Statement[] | null {
  if (!ts.isImportDeclaration(stmt)) return null;
  if (!ts.isStringLiteral(stmt.moduleSpecifier)) return null;

  const originalSource = stmt.moduleSpecifier.text;
  const rule = rules[originalSource];
  if (rule === undefined) return null;

  const clause = stmt.importClause;
  const resolvedBareTarget = (target: string): string =>
    target.startsWith('.') ? resolveRelative(target, options) : target;

  if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
    // Default-only or namespace-only imports — bare-string rewrite still applies; function form
    // wouldn't have a name to receive, so leave it untouched in that case.
    if (typeof rule === 'string') {
      return [updateModuleSpecifier(stmt, resolvedBareTarget(rule), factory)];
    }
    return null;
  }

  if (typeof rule === 'string') {
    return [updateModuleSpecifier(stmt, resolvedBareTarget(rule), factory)];
  }

  // Function form: bucket elements by resolved target source.
  const buckets = new Map<string, { resolvedSource: string; specs: ts.ImportSpecifier[] }>();
  for (const element of clause.namedBindings.elements) {
    const localName = element.name.text;
    const importedName = element.propertyName?.text ?? localName;
    const target = rule(importedName);
    const resolvedSource =
      options.configDir && target.source.startsWith('.') ? resolveRelative(target.source, options) : target.source;
    const propertyName = target.name === localName ? undefined : factory.createIdentifier(target.name);
    const spec = factory.createImportSpecifier(false, propertyName, factory.createIdentifier(localName));
    const bucket = buckets.get(resolvedSource);
    if (bucket) bucket.specs.push(spec);
    else buckets.set(resolvedSource, { resolvedSource, specs: [spec] });
  }

  const out: ts.ImportDeclaration[] = [];
  for (const { resolvedSource, specs } of buckets.values()) {
    out.push(
      factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, undefined, factory.createNamedImports(specs)),
        factory.createStringLiteral(resolvedSource)
      )
    );
  }
  return out;
}

function updateModuleSpecifier(
  stmt: ts.ImportDeclaration,
  resolvedSource: string,
  factory: ts.NodeFactory
): ts.ImportDeclaration {
  return factory.updateImportDeclaration(
    stmt,
    stmt.modifiers,
    stmt.importClause,
    factory.createStringLiteral(resolvedSource),
    stmt.attributes
  );
}

/**
 * Resolve a relative `source` (from a rule) against `configDir`, then express
 * the result as a relative path *from* the output file. Bare specifiers should
 * not be passed here.
 */
export function resolveRelative(source: string, options: ImportRewriteOptions): string {
  if (!source.startsWith('.')) return source;
  const { configDir, outputFile } = options;
  if (!configDir || !outputFile) return source;
  const absolute = resolve(configDir, source);
  let rel = relative(dirname(outputFile), absolute);
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.split(sep).join('/');
}
