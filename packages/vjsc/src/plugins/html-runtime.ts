import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'rolldown';

const HTML_RUNTIME_SOURCE = 'vjsc/html-runtime';

/**
 * Resolve the HTML target's JSX runtime to its module file. From source that is the sibling `html-runtime` directory;
 * from the built package it is the public export.
 */
export function resolveHtmlRuntime(id: string): string | null {
  if (id !== `${HTML_RUNTIME_SOURCE}/jsx-runtime` && id !== `${HTML_RUNTIME_SOURCE}/jsx-dev-runtime`) return null;

  const here = fileURLToPath(import.meta.url);
  const entry = id.slice(HTML_RUNTIME_SOURCE.length + 1);

  return here.endsWith('.ts')
    ? resolve(dirname(here), `../html-runtime/${entry}.ts`)
    : fileURLToPath(import.meta.resolve(id));
}

/** Serve `vjsc/html-runtime/*` from the runtime module while HTML target modules compile. */
export function htmlRuntimePlugin(): Plugin {
  return {
    name: 'vjsc:html-runtime',
    enforce: 'pre',
    resolveId: {
      order: 'pre',
      handler(id) {
        return resolveHtmlRuntime(id);
      },
    },
  } as Plugin;
}
