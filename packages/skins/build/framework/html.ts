import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { ComponentGraph, ValidatedComponentGraphModule } from 'vjsc/graph';
import {
  collectComponentGraphModules,
  createComponentGraphStyles,
  renderComponentGraphHtml,
  validateComponentGraph,
} from 'vjsc/graph';

import { isSkinName, type SkinMeta, type SkinModuleMeta, type SkinName } from '../../vjsc/meta.ts';
import type { GeneratedFrameworkFile } from './files.ts';

const packageRoot = 'packages/html/src';
const internalRoot = `${packageRoot}/internal/skins`;
const presets = ['audio', 'live-audio', 'live-video', 'video'] as const;

export interface CreateHtmlPackageSkinsOptions {
  readonly workspaceDir: string;
  readonly baseStyles?: readonly string[] | undefined;
}

interface HtmlSkin {
  readonly root: HtmlSkinRoot;
  readonly modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[];
  readonly preset: (typeof presets)[number];
  readonly theme: SkinMeta['style']['theme'];
}

type HtmlSkinRoot = ValidatedComponentGraphModule<SkinMeta & { readonly name: SkinName }> & {
  readonly meta: SkinMeta & { readonly name: SkinName };
};

/** Generate package-local HTML Skin templates, registrations, and styles from one finalized VJSC component graph. */
export async function createHtmlPackageSkins(
  graph: ComponentGraph<SkinModuleMeta>,
  options: CreateHtmlPackageSkinsOptions
): Promise<GeneratedFrameworkFile[]> {
  const skins = htmlSkins(graph);
  const allModules = uniqueModules(skins.flatMap((skin) => skin.modules));
  const iconModule = htmlIconModule(allModules);
  const templates = await renderComponentGraphHtml(
    graph,
    skins.map((skin) => ({
      name: skin.root.meta.name,
      moduleId: skin.root.id,
      exportName: `${pascalCase(skin.theme)}${pascalCase(skin.preset)}Skin`,
    })),
    {
      aliases: new Map([
        ['@videojs/core/i18n/text/menu', resolve(options.workspaceDir, 'packages/core/src/core/i18n/text/menu.ts')],
        ['@videojs/utils/string', resolve(options.workspaceDir, 'packages/utils/src/string/index.ts')],
        ['vjsc/target', resolve(options.workspaceDir, 'packages/vjsc/src/target/attributes.ts')],
      ]),
      empty: (specifier) =>
        specifier.startsWith('@videojs/html/ui/') ||
        specifier === '@videojs/html/i18n' ||
        specifier === 'vjsc/components' ||
        specifier.startsWith('virtual:vjsc/css/'),
      modules: new Map([
        ['@videojs/html/icons', iconModule],
        ['@videojs/html/icons/minimal', iconModule],
      ]),
    }
  );
  const generated = new Map<string, string>();

  for (const skin of skins) {
    const name = skin.root.meta.name;
    const root = `${internalRoot}/${name}`;
    const template = templates.get(name);
    if (template === undefined) throw new Error(`HTML Skin \`${name}\` did not render a template.`);

    addGenerated(generated, `${root}/template.ts`, htmlTemplateModule(template));
    addGenerated(generated, `${root}/register.ts`, htmlRegistration(template, skin.modules));
    addGenerated(
      generated,
      `${root}/skin.css`,
      await createComponentGraphStyles(graph, skin.modules, {
        label: name,
        files: options.baseStyles ?? ['./styles/base.css'],
      })
    );
  }

  for (const [source, destination] of [
    ['packages/skins/framework/html/background/skin.ts', `${packageRoot}/presets/background/skin.ts`],
    ['packages/skins/framework/html/background/skin.css', `${packageRoot}/define/background/skin.css`],
  ] as const) {
    addGenerated(generated, destination, await readFile(resolve(options.workspaceDir, source), 'utf8'));
  }

  return [...generated]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => ({ path, content }));
}

export function htmlPackageSkinOwnedPaths(): string[] {
  return [internalRoot, `${packageRoot}/presets/background/skin.ts`, `${packageRoot}/define/background/skin.css`];
}

function htmlSkins(graph: ComponentGraph<SkinModuleMeta>): HtmlSkin[] {
  const modules = validateComponentGraph(graph);
  const roots = [...modules.values()].filter(
    (module): module is HtmlSkinRoot =>
      module.meta?.type === 'skin' &&
      isSkinName(module.meta.name) &&
      module.transform.target === 'html' &&
      module.transform.style === 'css' &&
      module.transform.skin === module.meta.name
  );

  if (roots.length !== presets.length * 2) {
    throw new Error(`Expected ${presets.length * 2} HTML CSS Skin roots, received ${roots.length}.`);
  }

  return roots
    .map((root) => ({
      root,
      modules: collectComponentGraphModules(graph, root.id),
      preset: presetForSkin(root.meta.name),
      theme: root.meta.style.theme,
    }))
    .sort((left, right) => left.root.meta.name.localeCompare(right.root.meta.name));
}

function htmlTemplateModule(html: string): string {
  const template = html.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');

  return `import { createTemplate } from '@videojs/utils/dom';

/** Static template rendered from the finalized VJSC component graph. */
export const template = createTemplate(/* html */ \`${template}\`);
`;
}

function htmlRegistration(html: string, modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[]): string {
  const output: string[] = [];
  const tags = new Set<string>();

  for (const match of html.matchAll(/<media-([a-z0-9-]+)\b/g)) tags.add(match[1]!);

  if (tags.delete('text')) output.push("import '../../../define/i18n';");

  tags.delete('icon');
  output.push(...[...tags].map((tag) => `import '../../../define/ui/${tag}';`));

  const families = iconRegistrations(modules);

  if (families.size > 0) output.push("import { registerIcons } from '../../../icons';");

  for (const [family, icons] of sortedEntries(families)) {
    const bindings = [...new Set(icons.values())].sort();
    const source = family === 'default' ? '../../../icons' : `../../../icons/${family}`;

    output.push(
      `import {\n${bindings
        .map((binding) => {
          const local = iconLocalBinding(family, binding);

          return `  ${binding}${local === binding ? '' : ` as ${local}`},`;
        })
        .join('\n')}\n} from '${source}';`
    );
  }

  if (families.size > 0) output.push('');

  for (const [family, icons] of sortedEntries(families)) {
    const entries = sortedEntries(icons)
      .map(([name, binding]) => `  ${quote(name)}: ${iconLocalBinding(family, binding)},`)
      .join('\n');

    output.push(`registerIcons(${quote(family)}, {\n${entries}\n});`);
  }

  return `${output.join('\n')}\n`;
}

function htmlIconModule(modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[]): string {
  const bindings = new Set<string>(['registerIcons']);

  for (const module of modules) {
    for (const binding of iconImports(module.source).keys()) bindings.add(binding);
  }

  return [...bindings]
    .sort()
    .map((name) => `export const ${name} = ${name === 'registerIcons' ? '() => {}' : "''"};`)
    .join('\n');
}

function iconRegistrations(
  modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[]
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const families = new Map<string, Map<string, string>>();

  for (const module of modules) {
    const imports = iconImports(module.source);

    for (const match of module.source.matchAll(/registerIcons\(['"]([^'"]+)['"],\s*\{([\s\S]*?)\}\);/g)) {
      const icons = families.get(match[1]!) ?? new Map<string, string>();

      for (const pair of match[2]!.matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*([A-Za-z_$][\w$]*)/g)) {
        const local = pair[3]!;

        icons.set(pair[1] ?? pair[2]!, imports.get(local) ?? local);
      }

      families.set(match[1]!, icons);
    }
  }

  return families;
}

function iconImports(source: string): ReadonlyMap<string, string> {
  const imports = new Map<string, string>();

  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@videojs\/html\/icons(?:\/minimal)?['"];?/g)) {
    for (const specifier of match[1]!.split(',')) {
      const [imported, local = imported] = specifier.trim().split(/\s+as\s+/);

      if (imported && local && imported !== 'registerIcons') imports.set(local, imported);
    }
  }

  return imports;
}

function uniqueModules(
  modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[]
): ValidatedComponentGraphModule<SkinModuleMeta>[] {
  return [...new Map(modules.map((module) => [module.id, module])).values()];
}

function presetForSkin(name: SkinName): HtmlSkin['preset'] {
  const preset = name.replace(/^(?:default|minimal)-/, '');
  if (!isPreset(preset)) throw new Error(`Unsupported Skin preset: \`${name}\`.`);

  return preset;
}

function isPreset(value: string): value is HtmlSkin['preset'] {
  return presets.some((preset) => preset === value);
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function sortedEntries<Key extends string, Value>(map: ReadonlyMap<Key, Value>): [Key, Value][] {
  return [...map].sort(([left], [right]) => left.localeCompare(right));
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function iconLocalBinding(family: string, binding: string): string {
  return family === 'default' ? binding : `${binding}${pascalCase(family)}`;
}

function addGenerated(files: Map<string, string>, path: string, content: string): void {
  const previous = files.get(path);

  if (previous !== undefined && previous !== content) {
    throw new Error(`HTML package Skin output collision: \`${path}\`.`);
  }

  files.set(path, content);
}
