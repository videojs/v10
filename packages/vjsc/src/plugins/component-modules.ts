import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

import { parseSync } from 'oxc-parser';
import type { ModuleType, Plugin } from 'rolldown';

import { isVjscModule, moduleFilename, moduleId, type ParsedModuleId, parseModuleId } from '../utils/module-id';

export interface ComponentModuleContext extends ParsedModuleId {
  readonly id: string;
}

export interface ComponentModulesPluginOptions {
  readonly ignore?: ((module: ComponentModuleContext) => boolean) | undefined;
}

/**
 * Carry a component transform query through relative imports and retain type-only modules.
 * Use before component transforms when one source tree is built for multiple targets.
 *
 * @example An import from `entry.tsx?target=react` inherits its transform query:
 * ```diff
 * - icon.tsx
 * + icon.tsx?target=react
 * ```
 *
 * @param options - Controls which query-bearing modules participate.
 */
export function componentModulesPlugin(options: ComponentModulesPluginOptions = {}): Plugin {
  const typeEntries = new Map<string, string>();

  return {
    name: 'vjsc:component-modules',
    buildStart() {
      typeEntries.clear();
    },
    resolveId: {
      order: 'pre',
      async handler(id, importer, resolveOptions) {
        const selected = selectedModule(id, options.ignore);
        const inherited = importer ? selectedModule(importer, options.ignore) : null;
        if (!selected && (!inherited || !id.startsWith('.'))) return null;

        const resolved = await this.resolve(selected?.filename ?? id, importer ? moduleFilename(importer) : undefined, {
          ...resolveOptions,
          skipSelf: true,
        });
        if (!resolved || resolved.external || !isVjscModule(resolved.id)) return resolved;

        return {
          ...resolved,
          id: moduleId(moduleFilename(resolved.id), selected?.parameters ?? inherited!.parameters),
        };
      },
    },
    async load(id) {
      const selected = selectedModule(id, options.ignore);
      if (!selected) return null;

      this.addWatchFile(selected.filename);
      const code = await readFile(selected.filename, 'utf8');

      for (const specifier of typeImportSpecifiers(code, selected.filename)) {
        const filename = specifier.startsWith('.') ? resolveSourceModule(selected.filename, specifier) : undefined;
        const typeId = filename ? moduleId(filename, selected.parameters) : undefined;
        if (typeId && !typeEntries.has(typeId)) {
          typeEntries.set(typeId, this.emitFile({ type: 'chunk', id: typeId, importer: id, preserveSignature: false }));
          await this.load({ id: typeId, resolveDependencies: true });
        }
      }

      return {
        code,
        moduleType: scriptModuleType(selected.filename),
      };
    },
    generateBundle(_options, bundle) {
      for (const reference of typeEntries.values()) {
        const filename = this.getFileName(reference);
        const output = bundle[filename];
        const imported = Object.values(bundle).some(
          (candidate) =>
            candidate.type === 'chunk' && candidate.fileName !== filename && candidate.imports.includes(filename)
        );
        if (output?.type === 'chunk' && !imported) delete bundle[filename];
      }
    },
  };
}

function selectedModule(
  id: string,
  ignore: ComponentModulesPluginOptions['ignore']
): (ComponentModuleContext & ParsedModuleId) | null {
  const parsed = parseModuleId(id);
  const module = { id, ...parsed };

  return parsed.parameters.size > 0 && isVjscModule(id) && !(ignore?.(module) ?? false) ? module : null;
}

function scriptModuleType(filename: string): ModuleType {
  switch (extname(filename)) {
    case '.tsx':
      return 'tsx';
    case '.jsx':
      return 'jsx';
    case '.ts':
    case '.mts':
    case '.cts':
      return 'ts';
    default:
      return 'js';
  }
}

function typeImportSpecifiers(code: string, filename: string): ReadonlySet<string> {
  const parsed = parseSync(filename, code);
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  const specifiers = new Set<string>();

  for (const statement of parsed.program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const typeOnly =
      statement.importKind === 'type' ||
      (statement.specifiers.length > 0 &&
        statement.specifiers.every(
          (specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'
        ));
    if (typeOnly) specifiers.add(statement.source.value);
  }

  return specifiers;
}

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const sourceExtensionSet = new Set<string>(sourceExtensions);

function resolveSourceModule(importer: string, specifier: string): string | undefined {
  const candidate = resolve(dirname(importer), specifier);
  if (sourceExtensionSet.has(extname(candidate)) && existsSync(candidate)) return candidate;

  for (const extension of sourceExtensions) {
    const filename = `${candidate}${extension}`;
    if (existsSync(filename)) return filename;
  }

  for (const extension of sourceExtensions) {
    const filename = resolve(candidate, `index${extension}`);
    if (existsSync(filename)) return filename;
  }

  return undefined;
}
