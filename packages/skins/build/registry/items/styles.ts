import type { RegistryStylesOptions } from 'vjsc/shadcn';

import { registryDocsUrl } from '../docs.ts';
import type { VideojsItemMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

export function registryStyles(target: RegistryTarget): RegistryStylesOptions {
  const meta = { role: 'support', public: false } satisfies VideojsItemMeta;

  const shared = {
    meta,
  } satisfies Pick<NonNullable<RegistryStylesOptions['theme']>, 'meta'>;

  // Each entry's item preserves the entry and the local files it imports; imported entries become dependencies.
  const themes = [
    {
      ...shared,
      name: '_style-minimal',
      target: 'styles/themes/minimal.css',
      entry: './styles/themes/minimal.css',
      title: 'Video.js Minimal theme',
      description: 'Editable token overrides used only by Minimal skins.',
    },
    {
      ...shared,
      name: '_style-video',
      target: 'styles/video/base.css',
      entry: './styles/video/base.css',
      title: 'Video.js video styles',
      description: 'Editable resets and token overrides used only by video skins.',
    },
    {
      ...shared,
      name: '_style-video-minimal',
      target: 'styles/video/minimal.css',
      entry: './styles/video/minimal.css',
      title: 'Video.js Minimal video styles',
      description: 'Minimal video stylesheet entry.',
    },
    {
      ...shared,
      name: '_style-audio',
      target: 'styles/audio/base.css',
      entry: './styles/audio/base.css',
      title: 'Video.js audio styles',
      description: 'Editable resets and token overrides used only by audio skins.',
    },
    {
      ...shared,
      name: '_style-audio-minimal',
      target: 'styles/audio/minimal.css',
      entry: './styles/audio/minimal.css',
      title: 'Video.js Minimal audio styles',
      description: 'Minimal audio stylesheet entry.',
    },
  ] satisfies NonNullable<RegistryStylesOptions['themes']>;

  return {
    theme: {
      ...shared,
      docs: themeContextDocs(target),
      name: '_style-theme',
      target: 'styles/base.css',
      entry: './styles/base.css',
      title: 'Video.js media theme',
      description: 'Editable shared media tokens, resets, preferences, and Tailwind compiler integration.',
      tailwind: target.styling === 'tailwind' ? './styles/tailwind.css' : undefined,
    },
    themes: themes.filter(({ name }) => target.theme === 'minimal' || !name.endsWith('-minimal')),
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
    meta,
  };
}

/** Keep this on the shared theme item so transitive CLI output includes the contract only once. */
function themeContextDocs(target: RegistryTarget): string {
  return `Installed automatically with Video.js skins and UI components. Use UI components inside an installed skin, or set \`data-theme="${target.theme}"\` and \`data-preset\` on a custom \`Container\`. See [Customize skins](${registryDocsUrl(target, 'how-to/customize-skins')}) for theme customization.`;
}
