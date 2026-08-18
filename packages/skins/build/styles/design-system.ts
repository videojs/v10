import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { __unstable__loadDesignSystem, compile, normalizePath } from '@tailwindcss/node';

/** Operations Skin style generation needs from a loaded Tailwind v4 design system. */
export interface DesignSystem {
  /** Return whether Tailwind recognizes a candidate. */
  recognizesCandidate(candidate: string): boolean;
  /** Compile semantic CSS containing Tailwind directives such as `@apply`. */
  compileCss(css: string): Promise<string>;
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
    recognizesCandidate(candidate: string): boolean {
      const cached = candidateCache.get(candidate);
      if (cached !== undefined) return cached;
      const css = design.candidatesToCss([candidate])[0];
      const recognized = typeof css === 'string' && css.trim().length > 0;
      candidateCache.set(candidate, recognized);
      return recognized;
    },
    compileCss: compileReferencedCss,
  };
}
