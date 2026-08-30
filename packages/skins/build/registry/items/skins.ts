import { posix } from 'node:path';

import { type Graph, type GraphModule, bundleStyles } from '../../../../vjsc/src/graph/index.ts';
import type { RegistryCreatedItem, RegistryModuleItem } from '../../../../vjsc/src/shadcn/index.ts';
import { isSkinName, type SkinModuleMeta, type SkinName } from '../../../src/meta.ts';
import { createHtmlSkinRegistration, createSourceOwnedHtml, type RenderedHtmlSkin } from '../../packages/html.ts';
import { skinDirectory, skinPreset } from '../../skin.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import { packageRequirements, registryPaths, type RegistryTarget } from '../targets.ts';
import { exportedComponentName } from './components.ts';
import { reactHelperDependency } from './support.ts';

export async function htmlSkinItem(
  skin: RenderedHtmlSkin,
  graph: Graph<SkinModuleMeta>,
  target: RegistryTarget
): Promise<RegistryCreatedItem> {
  const meta = skin.root.meta;

  const name = meta.style.theme === 'minimal' ? `${skin.preset}-minimal` : skin.preset;
  const directory = meta.style.theme === 'minimal' ? `skins/${skin.preset}/minimal` : `skins/${skin.preset}`;
  const template = createSourceOwnedHtml(skin.template);

  const styleTarget = target.styling === 'css' ? `${directory}/skin.css` : 'styles/theme.css';
  const styleImport = relativeRegistryImport(`${directory}/skin.ts`, styleTarget);

  const registration = `${`import '${styleImport}';`}\n\n${createHtmlSkinRegistration(
    template,
    skin.modules,
    'registry'
  )}`;

  const files: NonNullable<RegistryCreatedItem['files']> = [
    {
      path: 'skin.html',
      target: `${registryPaths.install}/${directory}/skin.html`,
      type: 'registry:file',
      content: template,
    },
    {
      path: 'skin.ts',
      target: `${registryPaths.install}/${directory}/skin.ts`,
      type: 'registry:file',
      content: registration,
    },
  ];

  if (target.styling === 'css') {
    files.push({
      path: 'skin.css',
      target: `${registryPaths.install}/${directory}/skin.css`,
      type: 'registry:style',
      content: await bundleStyles(graph, skin.modules, {
        label: name,
        files: ['./styles/base.css'],
      }),
    });
  }

  return {
    name,
    type: 'registry:block',
    title: meta.title,
    description: meta.description,
    categories: ['media', 'skins', skin.preset],
    docs: skinDocs(skin.root, meta, meta.name, target, directory),
    dependencies: ['@videojs/html'],
    registryDependencies: target.styling === 'tailwind' ? ['@videojs/_style-theme'] : [],
    files,
    meta: {
      role: 'skin',
      framework: 'html',
      styling: target.styling,
      preset: skin.preset,
      media: skin.preset.endsWith('audio') ? 'audio' : 'video',
      theme: meta.style.theme,
      public: true,
    } satisfies VideojsRegistryMeta,
    group: 'skins',
  };
}

export function skinItem(
  module: GraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'skin' }>,
  target: RegistryTarget
): RegistryModuleItem<SkinModuleMeta> {
  const skin = meta.name;
  if (!isSkinName(skin)) throw new Error(`Unknown Skin registry module: \`${skin}\`.`);

  const preset = skinPreset(skin);
  const theme = meta.style.theme;
  const directory = theme === 'minimal' ? `skins/${preset}/minimal` : `skins/${preset}`;
  const registryMeta = {
    role: 'skin',
    framework: target.framework,
    styling: target.styling,
    preset,
    media: preset.endsWith('audio') ? 'audio' : 'video',
    theme,
    public: true,
  } satisfies VideojsRegistryMeta;

  return {
    name: theme === 'minimal' ? `${preset}-minimal` : preset,
    type: 'registry:block',
    title: meta.title,
    description: meta.description,
    categories: ['media', 'skins', preset],
    docs: skinDocs(module, meta, skin, target, directory),
    registryDependencies: [...reactHelperDependency(target), '@videojs/_style-theme'],
    meta: registryMeta,
    group: 'skins',
    target: (candidate, root) => skinModuleTarget(candidate, root, skin, target.framework),
    stylesheet: target.styling === 'css' ? { target: `${directory}/skin.css` } : undefined,
  };
}

function relativeRegistryImport(importer: string, target: string): string {
  const specifier = posix.relative(posix.dirname(importer), target);

  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

function skinModuleTarget(
  module: GraphModule<SkinModuleMeta>,
  root: GraphModule<SkinModuleMeta>,
  skin: SkinName,
  framework: RegistryTarget['framework']
): string {
  if (module.id === root.id) return `${skinDirectory(skin)}/skin.tsx`;

  const sourcePath = module.sourcePath;

  if (sourcePath.startsWith('components/')) {
    const component = sourcePath.slice('components/'.length);

    return framework === 'html' ? `${skinDirectory(skin)}/ui/${component}` : `ui/${component}`;
  }

  const match = /^skins\/([^/]+)\/(.+)$/.exec(sourcePath);
  if (!match) throw new Error(`Unsupported registry source: \`${sourcePath}\`.`);

  const [, owner, filename] = match;
  const directory = owner && isSkinName(owner) ? skinDirectory(owner) : `skins/${owner}`;

  return `${directory}/${filename}`;
}

function skinDocs(
  module: GraphModule<SkinModuleMeta>,
  meta: Extract<SkinModuleMeta, { type: 'skin' }>,
  skin: SkinName,
  target: RegistryTarget,
  directory: string
): string {
  const component = exportedComponentName(module);
  const preset = skinPreset(skin);
  const player = `${pascalCase(preset)}Player`;
  const media = preset.endsWith('audio') ? 'HlsAudio' : 'HlsJsVideo';
  const mediaEntry = preset.endsWith('audio') ? 'hls-audio' : 'hlsjs-video';

  if (target.framework === 'html') {
    return `Installs editable ${meta.title} source under \`${registryPaths.install}/${directory}\`. Requires \`${packageRequirements.html}\`; import the matching Player and media registrations before using the installed light-DOM template.`;
  }

  return `Requires \`${packageRequirements.react}\`, which is installed with this item.

\`\`\`tsx
import { ${media} } from '@videojs/react/media/${mediaEntry}';
import { ${player} } from '@videojs/react/${preset}';

import { ${component} } from '${registryPaths.import}/${directory}/skin';

export function Player({ src }: { src: string }) {
  return (
    <${player}>
      <${component} className="aspect-video w-full">
        <${media} src={src} />
      </${component}>
    </${player}>
  );
}
\`\`\``;
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
