import { globSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as ts from 'typescript';

export interface Violation {
  package: string;
  symbol: string;
  file: string;
}

export interface PackageRef {
  /** Published name, e.g. `@videojs/core`. */
  name: string;
  /** Directory relative to the monorepo root, e.g. `packages/core`. */
  dir: string;
}

/** Resolves each package's public entries and checks every top-level export for a JSDoc summary. */
export async function checkJsDocPresence(
  monorepoRoot: string,
  packages: PackageRef[]
): Promise<{ violations: Violation[] }> {
  const violations: Violation[] = [];
  for (const pkg of packages) {
    const packageRoot = path.resolve(monorepoRoot, pkg.dir);
    const entryFiles = await resolveEntryFiles(packageRoot);
    violations.push(
      ...collectPackageViolations({
        packageName: pkg.name,
        packageRoot,
        entryFiles,
        tsconfigPath: path.join(packageRoot, 'tsconfig.json'),
      })
    );
  }
  return { violations };
}

export interface PackageCheckOptions {
  packageName: string;
  /** Absolute path to the package directory. */
  packageRoot: string;
  /** Absolute paths to the package's public entry source files. */
  entryFiles: string[];
  /** Absolute path to the package's tsconfig.json (for `@/` paths, jsx, lib). */
  tsconfigPath: string;
}

/** The check engine: enumerates module exports and flags those without a JSDoc summary. */
export function collectPackageViolations(opts: PackageCheckOptions): Violation[] {
  const { packageName, packageRoot, entryFiles, tsconfigPath } = opts;
  const program = ts.createProgram(entryFiles, loadCompilerOptions(tsconfigPath));
  const checker = program.getTypeChecker();
  const srcDir = path.join(packageRoot, 'src');

  const violations: Violation[] = [];
  const seen = new Set<string>();
  const visitedModules = new Set<ts.Symbol>();

  const checkSymbol = (exported: ts.Symbol): void => {
    const target = resolveAlias(exported, checker);
    const declarations = target.getDeclarations() ?? [];

    // Namespace re-export (`export * as Ns from './mod'`, used by compound
    // components): descend into its members, which are the real public surface
    // (e.g. AlertDialog.Root) and where the JSDoc lives.
    if (declarations.some(ts.isSourceFile)) {
      if (visitedModules.has(target)) return;
      visitedModules.add(target);
      for (const member of checker.getExportsOfModule(target)) checkSymbol(member);
      return;
    }

    // Only flag symbols declared in this package's own src; cross-package
    // re-exports (e.g. `@videojs/core/dom`) are checked in their owning package.
    const inPackage = declarations.filter((d) => isUnder(d.getSourceFile().fileName, srcDir));
    if (inPackage.length === 0) return;
    if (inPackage.every(isLeafWrapper)) return;
    if (inPackage.some(hasInternalTag)) return;

    const summary = target
      .getDocumentationComment(checker)
      .map((part) => part.text)
      .join('')
      .trim();
    if (summary !== '') return;

    const declFile = inPackage[0].getSourceFile().fileName;
    const key = `${declFile}#${target.getName()}`;
    if (seen.has(key)) return;
    seen.add(key);

    violations.push({
      package: packageName,
      symbol: target.getName(),
      file: path.relative(packageRoot, declFile),
    });
  };

  for (const entryFile of entryFiles) {
    const sourceFile = program.getSourceFile(entryFile);
    if (!sourceFile) continue;
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) checkSymbol(exported);
  }

  return violations;
}

/** Resolves a package's public-API entry source files from its tsdown config. */
export async function resolveEntryFiles(packageDir: string): Promise<string[]> {
  const configPath = path.join(packageDir, 'tsdown.config.ts');
  let mod: { default?: unknown };
  try {
    mod = await import(pathToFileURL(configPath).href);
  } catch (cause) {
    throw new Error(`Failed to load tsdown config at ${configPath}: ${(cause as Error).message}`, { cause });
  }

  // tsdown's `defineConfig` returns the user config (or an array, one per build mode).
  const value = mod.default;
  const config = Array.isArray(value) ? value[0] : value;
  if (typeof config !== 'object' || config === null) {
    throw new Error(`Unexpected tsdown config default export shape in ${configPath}`);
  }

  const entry = (config as { entry?: unknown }).entry;
  const patterns = entryToPatterns(entry, configPath);

  const files = new Set<string>();
  for (const pattern of patterns) {
    // globSync handles literal paths and globs uniformly.
    for (const rel of globSync(pattern, { cwd: packageDir })) {
      const abs = path.resolve(packageDir, rel);
      if (/\.(test|spec)\.[cm]?tsx?$/.test(abs) || abs.endsWith('.d.ts')) continue;
      files.add(abs);
    }
  }
  return [...files];
}

function entryToPatterns(entry: unknown, configPath: string): string[] {
  if (typeof entry === 'string') return [entry];
  if (Array.isArray(entry)) return entry.filter((e): e is string => typeof e === 'string');
  if (typeof entry === 'object' && entry !== null) {
    return Object.values(entry).filter((e): e is string => typeof e === 'string');
  }
  throw new Error(`Unsupported tsdown "entry" shape in ${configPath}`);
}

function resolveAlias(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function isUnder(file: string, dir: string): boolean {
  const rel = path.relative(dir, file);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Leaf wrappers add nothing beyond the base, so they're exempt from the summary
 * rule: empty-body `interface Foo extends Bar {}` and pure-alias `type Foo = Bar`.
 */
function isLeafWrapper(decl: ts.Declaration): boolean {
  if (ts.isInterfaceDeclaration(decl)) {
    return decl.members.length === 0 && (decl.heritageClauses?.length ?? 0) > 0;
  }
  if (ts.isTypeAliasDeclaration(decl)) {
    return ts.isTypeReferenceNode(decl.type) && !decl.type.typeArguments;
  }
  return false;
}

function hasInternalTag(decl: ts.Declaration): boolean {
  return ts.getJSDocTags(decl).some((tag) => tag.tagName.text === 'internal');
}

function loadCompilerOptions(tsconfigPath: string): ts.CompilerOptions {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host);
  if (!parsed) throw new Error(`Failed to parse tsconfig at ${tsconfigPath}`);
  return {
    ...parsed.options,
    noEmit: true,
    skipLibCheck: true,
    composite: false,
    types: [],
  };
}
