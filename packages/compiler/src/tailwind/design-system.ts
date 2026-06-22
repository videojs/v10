import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __unstable__loadDesignSystem } from 'tailwindcss';

/**
 * A loaded Tailwind v4 design system. Wraps Tailwind's
 * `__unstable__loadDesignSystem` return value with a small surface focused on
 * what `decompose` needs:
 *
 *   - `compileUtility(name)` — compile a single utility class to CSS, or
 *     `null` if Tailwind doesn't recognize it.
 *
 * Internally caches per-utility output so repeated lookups (the same utility
 * referenced on many JSX elements) don't re-walk Tailwind's pipeline.
 */
export interface DesignSystem {
  /** The path the design system was loaded from, for diagnostics. */
  readonly cssPath: string;
  /** Compile a single utility class to CSS. Returns `null` for unknown candidates. */
  compileUtility(utility: string): string | null;
  /**
   * Resolve a `@theme` variable (e.g. `--spacing`, `--color-white`) to its
   * value, or `undefined` if the theme doesn't define it. Used to emit a
   * self-contained theme block for the variables compiled rules reference.
   * Returns `undefined` for `@property`-registered slots like `--tw-*`.
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

  const ds = await __unstable__loadDesignSystem(raw, {
    base: dirname(absolute),
    loadStylesheet: async (id, base) => {
      const resolved = resolveStylesheet(id, base);
      return {
        path: resolved,
        base: dirname(resolved),
        content: readFileSync(resolved, 'utf8'),
      };
    },
  });

  const cache = new Map<string, string | null>();
  const themeCache = new Map<string, string | undefined>();

  return {
    cssPath: absolute,
    compileUtility(utility: string): string | null {
      const cached = cache.get(utility);
      if (cached !== undefined) return cached;
      const [css] = ds.candidatesToCss([utility]);
      const value = css ?? null;
      cache.set(utility, value);
      return value;
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
    } catch {
      // fall through
    }
  }
  const fallback = resolve(pkgDir, 'index.css');
  if (existsSync(fallback)) return fallback;
  return pkgDir;
}
