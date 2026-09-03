import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { __unstable__loadDesignSystem, compile, normalizePath } from '@tailwindcss/node';

/** Operations style generation needs from a loaded Tailwind v4 design system. */
export interface DesignSystem {
  /** Files that contribute to the loaded Tailwind design. */
  readonly watchFiles: ReadonlySet<string>;
  /** Return whether Tailwind recognizes a candidate. */
  recognizesCandidate(candidate: string): boolean;
  /** Return Tailwind's compiled CSS for one candidate. */
  candidateCss(candidate: string): string | undefined;
  /** Compile semantic CSS containing Tailwind directives such as `@apply`. Results are memoized by source. */
  compileCss(css: string): Promise<string>;
}

/** Load a design system from a Tailwind v4 entry CSS file. */
export async function loadDesignSystem(cssPath: string): Promise<DesignSystem> {
  const absolute = resolve(cssPath);
  const base = dirname(absolute);
  const raw = readFileSync(absolute, 'utf8');
  const reference = `@reference "${normalizePath(absolute)}";`;
  const design = await __unstable__loadDesignSystem(raw, { base });
  const candidateCache = new Map<string, string | undefined>();
  const watchFiles = new Set([absolute]);
  const candidateCss = (candidate: string): string | undefined => {
    if (candidateCache.has(candidate)) return candidateCache.get(candidate);

    const css = design.candidatesToCss([candidate])[0];
    const compiled = typeof css === 'string' && css.trim().length > 0 ? css : undefined;

    candidateCache.set(candidate, compiled);
    return compiled;
  };

  const compiled = new Map<string, Promise<string>>();
  const compileReferencedCss = (css: string): Promise<string> => {
    const cached = compiled.get(css);
    if (cached) return cached;

    const result = compile(`${reference}\n${css}`, {
      base,
      onDependency(path) {
        watchFiles.add(resolve(path));
      },
    }).then((compiler) => compiler.build([]));

    compiled.set(css, result);
    result.catch(() => {
      if (compiled.get(css) === result) compiled.delete(css);
    });

    return result;
  };

  return {
    watchFiles,
    recognizesCandidate(candidate: string): boolean {
      return candidateCss(candidate) !== undefined;
    },
    candidateCss,
    compileCss: compileReferencedCss,
  };
}
