import { readFile } from 'node:fs/promises';
import { basename, posix, resolve } from 'node:path';
import { format } from 'oxfmt';
import { type CatalogOutputFile, type CatalogStyleTransform, emitCatalog } from 'vjsc/catalog';
import { registry as htmlRegistry } from '../../html/compiler';
import { registry as reactRegistry } from '../../react/compiler';

import {
  catalogSourcePath,
  type SkinCatalog,
  type SkinCatalogSkin,
  skinRootClassName,
  skinRootComponentName,
} from './catalog';
import { createCompilerHtmlConfig } from './transform/html';
import { createCompilerReactConfig, type ReactImportResolver } from './transform/react';

export type FrameworkTarget =
  | { framework: 'html'; resolveImport?: ((specifier: string) => string) | undefined }
  | { framework: 'react'; resolveImport?: ReactImportResolver | undefined };

interface FrameworkSkinFile extends CatalogOutputFile {
  readonly framework: FrameworkTarget['framework'];
}

interface FrameworkSkinOutput {
  files: readonly FrameworkSkinFile[];
  styles: readonly CatalogOutputFile[];
}

interface EmitFrameworkSkinOptions {
  skin: SkinCatalogSkin['name'];
  iconSet?: string | undefined;
  targets: readonly FrameworkTarget[];
}

/** Emit the built-in React, HTML, and vanilla-CSS forms of one canonical Skin. */
export async function emitFrameworkSkin(
  catalog: SkinCatalog,
  options: EmitFrameworkSkinOptions
): Promise<FrameworkSkinOutput> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');

  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const targets = uniqueTargets(options.targets, skin.name);

  const styles: CatalogStyleTransform = {
    mode: 'css',
    input: catalog.resources.styles.tailwind.compiler,
    scope: `.${skin.style.scope}`,
    variant: skin.style.variant,
  };

  const iconSet = options.iconSet ?? 'default';

  const files: FrameworkSkinFile[] = [];

  let compiledStyles: readonly CatalogOutputFile[] | undefined;

  for (const target of targets) {
    const output =
      target.framework === 'html'
        ? await emitHtmlTarget(catalog, skin, iconSet, styles, target)
        : await emitReactTarget(catalog, skin, iconSet, styles, target);

    files.push(...output.files);
    compiledStyles ??= output.styles;
  }

  return {
    files,
    styles: await packageStyles(catalog, compiledStyles ?? [], skin.style.theme),
  };
}

async function emitReactTarget(
  catalog: SkinCatalog,
  skin: SkinCatalogSkin,
  iconSet: string,
  styles: CatalogStyleTransform,
  target: Extract<FrameworkTarget, { framework: 'react' }>
): Promise<{ files: FrameworkSkinFile[]; styles: readonly CatalogOutputFile[] }> {
  const entryPath = catalogSourcePath(skin.source);
  const entryDir = posix.dirname(entryPath);

  const output = await emitCatalog(catalog, {
    items: [skin.name],
    transform: {
      registry: reactRegistry,
      compiler: createCompilerReactConfig({
        iconSet,
        rootComponentName: skinRootComponentName(skin),
        rootClassName: skinRootClassName(skin),
        ...(target.resolveImport ? { resolveImport: target.resolveImport } : {}),
      }),
      styles,
    },
    files: {
      source: ({ sourceFile }) => {
        const path = catalogSourcePath(sourceFile);

        return path.startsWith(`${entryDir}/`) ? posix.relative(entryDir, path) : path;
      },
    },
  });

  return {
    files: output.files.source.map((file) => ({
      framework: 'react',
      path: file.path,
      content: file.content,
    })),
    styles: output.files.style,
  };
}

async function emitHtmlTarget(
  catalog: SkinCatalog,
  skin: SkinCatalogSkin,
  iconSet: string,
  styles: CatalogStyleTransform,
  target: Extract<FrameworkTarget, { framework: 'html' }>
): Promise<{ files: FrameworkSkinFile[]; styles: readonly CatalogOutputFile[] }> {
  const output = await emitCatalog(catalog, {
    items: [skin.name],
    transform: {
      mode: 'bundle',
      registry: htmlRegistry,
      compiler: createCompilerHtmlConfig({
        rootComponentName: skinRootComponentName(skin),
        rootClassName: skinRootClassName(skin),
      }),
      styles,
    },
    files: {
      source: () => 'skin.html',
    },
  });

  const bundled = output.files.source[0];

  if (output.files.source.length !== 1 || !bundled) {
    throw new Error(`HTML Skin generation expected one output file, but received ${output.files.source.length}.`);
  }

  const html = await format('skin.html', bundled.content, {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });

  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));

  const imports = htmlImports(output.references, iconSet, bundled.imports ?? []).map(
    target.resolveImport ?? ((specifier) => specifier)
  );
  const content = `${imports.map((specifier) => `import '${specifier}';`).join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;

  return {
    files: [{ framework: 'html', path: 'skin.ts', content }],
    styles: output.files.style,
  };
}

async function packageStyles(
  catalog: SkinCatalog,
  compiled: readonly CatalogOutputFile[],
  theme: SkinCatalogSkin['style']['theme'] = 'default'
): Promise<CatalogOutputFile[]> {
  const resources = catalog.resources.styles;
  const themePath = resources.themes[theme];

  if (!themePath) throw new Error(`Framework Skin generation requires a \`${theme}\` theme resource.`);

  const resourcePaths = [resources.base, ...(resources.shared ?? [])];
  const resourcesFiles = await Promise.all(
    resourcePaths.map(async (path) => ({
      path: `styles/${basename(path)}`,
      content: await readFile(resolve(catalog.rootDir, path), 'utf8'),
    }))
  );
  const themeFile = {
    path: 'styles/theme.css',
    content: await readFile(resolve(catalog.rootDir, themePath), 'utf8'),
  };
  const compiledFiles = compiled.map((file) => ({
    path: `styles/${file.path}`,
    content: file.content,
  }));
  const files = [...resourcesFiles, themeFile, ...compiledFiles];

  return [
    {
      path: 'styles/styles.css',
      content: [
        '@layer videojs.base, videojs.theme, videojs.components;',
        ...files.map((file) => `@import './${basename(file.path)}';`),
      ].join('\n'),
    },
    ...files,
  ];
}

function htmlImports(
  references: SkinCatalog['references'],
  iconSet: string,
  componentImports: readonly string[]
): string[] {
  return [...(references.icons.length > 0 ? [htmlIconElementImport(iconSet)] : []), ...componentImports];
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}

function uniqueTargets(targets: readonly FrameworkTarget[], skin: string): readonly FrameworkTarget[] {
  if (targets.length === 0) {
    throw new Error(`Framework Skin generation requires a target for Skin \`${skin}\`.`);
  }

  const frameworks = new Set<FrameworkTarget['framework']>();

  for (const target of targets) {
    if (frameworks.has(target.framework)) {
      throw new Error(`Framework Skin generation received duplicate ${target.framework} targets for Skin \`${skin}\`.`);
    }

    frameworks.add(target.framework);
  }

  return targets;
}

function escapeTemplate(content: string): string {
  return content.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
