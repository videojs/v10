import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __unstable__loadDesignSystem, compile, normalizePath } from '@tailwindcss/node';

/** Operations Skin style generation needs from a loaded Tailwind v4 design system. */
export interface DesignSystem {
  /** The path the design system was loaded from, for diagnostics. */
  readonly cssPath: string;
  /** Return whether Tailwind recognizes a candidate. */
  recognizesCandidate(candidate: string): boolean;
  /** Compile semantic CSS containing Tailwind directives such as `@apply`. */
  compileCss(css: string): Promise<string>;
  /** Compile Tailwind's reset inside a native CSS scope. */
  compilePreflight(scopeSelector: string): Promise<string>;
}

/** Load a design system from a Tailwind v4 entry CSS file. */
export async function loadDesignSystem(cssPath: string): Promise<DesignSystem> {
  const absolute = resolve(cssPath);
  const base = dirname(absolute);
  const raw = readFileSync(absolute, 'utf8');
  const reference = `@reference "${normalizePath(absolute)}";`;
  const design = await __unstable__loadDesignSystem(raw, { base });
  const candidateCache = new Map<string, boolean>();

  const compileReferencedCss = async (css: string): Promise<string> => {
    const compiler = await compile(`${reference}\n${css}`, { base, onDependency() {} });
    return compiler.build([]);
  };

  return {
    cssPath: absolute,
    recognizesCandidate(candidate: string): boolean {
      const cached = candidateCache.get(candidate);
      if (cached !== undefined) return cached;
      const css = design.candidatesToCss([candidate])[0];
      const recognized = typeof css === 'string' && css.trim().length > 0;
      candidateCache.set(candidate, recognized);
      return recognized;
    },
    compileCss: compileReferencedCss,
    async compilePreflight(scopeSelector: string): Promise<string> {
      const preflightPath = fileURLToPath(import.meta.resolve('tailwindcss/preflight.css'));
      const preflight = readFileSync(preflightPath, 'utf8');
      return compileReferencedCss(`@layer base {\n@scope (${scopeSelector}) {\n${preflight}\n}\n}`);
    },
  };
}
