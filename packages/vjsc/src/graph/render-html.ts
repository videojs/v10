import { rolldown } from 'rolldown';

import type { ModuleMeta } from '../components/meta';
import { HTML_RUNTIME } from '../plugins/html-runtime';
import type { VjscGraph } from './types';

const entryId = '\0vjsc:module-graph-html-entry';
const emptyId = '\0vjsc:module-graph-html-empty';
const runtimeId = '\0vjsc:module-graph-html-runtime';

type HtmlRenderProps = Readonly<Record<never, never>>;

export interface HtmlEntry {
  /** Stable key used for the rendered result. */
  readonly name: string;
  /** VJSC graph module containing the renderer export. */
  readonly moduleId: string;
  /** Named component export to render. */
  readonly exportName: string;
}

export interface RenderHtmlOptions {
  /** Redirect an external import to a concrete source module. */
  readonly aliases?: ReadonlyMap<string, string> | undefined;
  /** Replace imports that have no effect while rendering static markup. */
  readonly empty?: ((specifier: string) => boolean) | undefined;
  /** Provide source for external modules needed only while rendering. */
  readonly modules?: ReadonlyMap<string, string> | undefined;
}

/** Render named HTML component exports directly from one finalized module graph. */
export async function renderHtml<Meta extends ModuleMeta>(
  graph: VjscGraph<Meta>,
  entries: readonly HtmlEntry[],
  options: RenderHtmlOptions = {}
): Promise<ReadonlyMap<string, string>> {
  const modules = graph.modules;
  const importResolutions = new Map<string, string>();
  const virtualModules = new Map<string, string>();

  for (const module of modules.values()) {
    for (const reference of module.imports) {
      if (reference.resolvedId) importResolutions.set(importKey(module.id, reference.specifier), reference.resolvedId);
    }
  }

  for (const [specifier, source] of options.modules ?? []) {
    virtualModules.set(virtualId(specifier), source);
  }

  const entrySource = entries
    .map((entry, index) => {
      if (!modules.has(entry.moduleId)) {
        throw new Error(`HTML module graph entry is missing: \`${entry.moduleId}\`.`);
      }

      return `export { ${entry.exportName} as render${index} } from ${JSON.stringify(entry.moduleId)};`;
    })
    .join('\n');

  const build = await rolldown({
    input: entryId,
    treeshake: true,
    plugins: [
      {
        name: 'vjsc:render-module-graph-html',
        resolveId(id, importer) {
          if (id === entryId || id === emptyId || id === runtimeId || modules.has(id) || virtualModules.has(id)) {
            return id;
          }

          if (id === 'vjsc/html-runtime/jsx-runtime' || id === 'vjsc/html-runtime/jsx-dev-runtime') {
            return runtimeId;
          }

          if (options.empty?.(id)) return emptyId;

          const resolved = importer ? importResolutions.get(importKey(importer, id)) : undefined;
          if (resolved && modules.has(resolved)) return resolved;

          const alias = options.aliases?.get(id);
          if (alias) return alias;

          if (options.modules?.has(id)) return virtualId(id);

          return null;
        },
        load(id) {
          if (id === entryId) return { code: entrySource, moduleType: 'js' };

          if (id === emptyId) return { code: 'export {};', moduleType: 'js' };

          if (id === runtimeId) return { code: HTML_RUNTIME, moduleType: 'js' };

          const virtual = virtualModules.get(id);
          if (virtual !== undefined) return { code: virtual, moduleType: 'js' };

          const module = modules.get(id);
          if (!module) return null;

          return { code: module.source, moduleType: moduleType(module.filename) };
        },
      },
    ],
  });

  try {
    const output = await build.generate({ codeSplitting: false, format: 'esm' });
    const chunks = output.output.filter((value) => value.type === 'chunk');

    if (chunks.length !== 1 || chunks[0]!.imports.length > 0) {
      throw new Error('HTML module graph renderer did not produce one self-contained module.');
    }

    const url = `data:text/javascript;base64,${Buffer.from(chunks[0]!.code).toString('base64')}`;

    // SAFETY: The module is assembled from the finalized module graph and explicit render-only dependencies above.
    const rendered = (await import(url)) as Readonly<
      Record<string, (props?: HtmlRenderProps) => { toString(): string }>
    >;

    return new Map(
      entries.map((entry, index) => {
        const render = rendered[`render${index}`];
        if (!render) throw new Error(`HTML module graph entry \`${entry.name}\` has no renderer export.`);

        return [entry.name, formatHtml(String(render({})))] as const;
      })
    );
  } finally {
    await build.close();
  }
}

function importKey(importer: string, specifier: string): string {
  return `${importer}\0${specifier}`;
}

function virtualId(specifier: string): string {
  return `\0vjsc:module-graph-html-module:${specifier}`;
}

function moduleType(filename: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  if (filename.endsWith('.tsx')) return 'tsx';

  if (filename.endsWith('.ts')) return 'ts';

  if (filename.endsWith('.jsx')) return 'jsx';

  return 'js';
}

function formatHtml(html: string): string {
  return html.replace(/></g, '>\n<');
}
