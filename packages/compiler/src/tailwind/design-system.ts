import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __unstable__loadDesignSystem, compile } from 'tailwindcss';

const VIRTUAL_REFERENCE = './__videojs-compiler-tailwind-reference.css';

/**
 * A loaded Tailwind v4 design system. Wraps Tailwind's
 * design-system and compiler APIs behind the operations style extraction and
 * emission need. Candidate recognition is intentionally separate from CSS
 * generation: emitted CSS always comes from one complete candidate build.
 */
export interface DesignSystem {
  /** The path the design system was loaded from, for diagnostics. */
  readonly cssPath: string;
  /** Return whether Tailwind recognizes a candidate. */
  recognizesCandidate(candidate: string): boolean;
  /** Compile a complete candidate set with Tailwind's ordering and support rules. */
  compileCandidates(candidates: readonly string[]): Promise<string>;
  /**
   * Resolve a `@theme` variable (e.g. `--spacing`, `--color-white`) to its
   * value, or `undefined` if the theme doesn't define it. Used to emit a
   * self-contained theme block for the variables compiled rules reference.
   * Returns `undefined` for `@property`-registered variables like `--tw-*`.
   */
  resolveThemeVar(name: string): string | undefined;
}

/**
 * Load a design system from a Tailwind v4 entry CSS file. `@import "tailwindcss"`
 * and other `@import` directives resolve via Tailwind's own `loadStylesheet`
 * callback (the recommended hook for the v4 design-system loader).
 */
export async function loadDesignSystem(cssPath: string): Promise<DesignSystem> {
  const absolute = resolve(cssPath);
  const raw = readFileSync(absolute, 'utf8');
  const base = dirname(absolute);
  const loadStylesheet = async (id: string, importerBase: string) => {
    if (id === VIRTUAL_REFERENCE) {
      return { path: absolute, base, content: raw };
    }

    const resolved = resolveStylesheet(id, importerBase);
    return {
      path: resolved,
      base: dirname(resolved),
      content: readFileSync(resolved, 'utf8'),
    };
  };

  const ds = await __unstable__loadDesignSystem(raw, { base, loadStylesheet });

  const candidateCache = new Map<string, boolean>();
  const themeCache = new Map<string, string | undefined>();

  return {
    cssPath: absolute,
    recognizesCandidate(candidate: string): boolean {
      const cached = candidateCache.get(candidate);
      if (cached !== undefined) return cached;
      const css = ds.candidatesToCss([candidate])[0];
      const recognized = typeof css === 'string' && css.trim().length > 0;
      candidateCache.set(candidate, recognized);
      return recognized;
    },
    async compileCandidates(candidates: readonly string[]): Promise<string> {
      const compiler = await compile(`@reference "${VIRTUAL_REFERENCE}";\n@tailwind utilities;`, {
        base,
        loadStylesheet,
      });
      return compiler.build([...new Set(candidates)]);
    },
    resolveThemeVar(name: string): string | undefined {
      if (themeCache.has(name)) return themeCache.get(name);
      let value: string | undefined;
      try {
        value = ds.resolveThemeValue?.(name);
      } catch {
        value = undefined;
      }
      themeCache.set(name, value);
      return value;
    },
  };
}

/**
 * Resolve a stylesheet `@import` against the calling file's base directory.
 *
 *   - Bare specifiers (`tailwindcss`, `@some/pkg/file.css`) walk node_modules
 *     up from `base` until found.
 *   - Relative / absolute paths resolve as-is.
 */
function resolveStylesheet(id: string, base: string): string {
  if (isAbsolute(id)) return id;
  if (id.startsWith('.')) return resolve(base, id);

  // Walk up node_modules from `base` first (the file's own directory),
  // then fall back to walking up from the compiler package itself —
  // covers temp-dir test fixtures that have no local node_modules.
  const fromBase = walkUpForPackage(id, base);
  if (fromBase) return fromBase;

  const compilerDir = dirname(fileURLToPath(import.meta.url));
  const fromCompiler = walkUpForPackage(id, compilerDir);
  if (fromCompiler) return fromCompiler;

  throw new Error(`Cannot resolve stylesheet '${id}' from '${base}'`);
}

function walkUpForPackage(id: string, start: string): string | null {
  let dir = start;
  while (true) {
    const candidate = resolve(dir, 'node_modules', id);
    if (existsSync(candidate)) return resolveBareEntry(candidate);
    if (existsSync(`${candidate}.css`)) return `${candidate}.css`;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * For a resolved package directory, return the CSS entry — either via the
 * `style` / `exports['.'].style` / `main` field in `package.json`, falling
 * back to `index.css`.
 */
function resolveBareEntry(pkgDir: string): string {
  if (statSync(pkgDir).isFile()) return pkgDir;
  const pkgJson = resolve(pkgDir, 'package.json');
  if (existsSync(pkgJson)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as {
        style?: string;
        main?: string;
        exports?: Record<string, unknown> | string;
      };
      const exportsField = pkg.exports;
      if (typeof exportsField === 'string') return resolve(pkgDir, exportsField);
      if (exportsField && typeof exportsField === 'object' && '.' in exportsField) {
        const root = (exportsField as Record<string, unknown>)['.'];
        const style =
          root && typeof root === 'object' && 'style' in root ? (root as Record<string, string>).style : undefined;
        if (style) return resolve(pkgDir, style);
      }
      if (pkg.style) return resolve(pkgDir, pkg.style);
      if (pkg.main?.endsWith('.css')) return resolve(pkgDir, pkg.main);
    } catch (error) {
      throw new Error(`Cannot read stylesheet package manifest '${pkgJson}'.`, { cause: error });
    }
  }
  const fallback = resolve(pkgDir, 'index.css');
  if (existsSync(fallback)) return fallback;
  throw new Error(`Stylesheet package '${pkgDir}' has no CSS entry.`);
}
