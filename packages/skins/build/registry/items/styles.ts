import type { RegistryStylesOptions } from 'vjsc/shadcn';

import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

export function registryStyles(target: RegistryTarget): RegistryStylesOptions {
  const meta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    theme: {
      name: '_style-theme',
      target: 'styles/base.css',
      files: {
        './styles/base.audio.css': 'styles/base.audio.css',
        './styles/base.css': 'styles/base.css',
        './styles/base.video.css': 'styles/base.video.css',
        './styles/captions.css': 'styles/captions.css',
        './styles/themes/audio.css': 'styles/themes/audio.css',
        './styles/themes/minimal.css': 'styles/themes/minimal.css',
        './styles/themes/preferences.css': 'styles/themes/preferences.css',
        './styles/themes/theme.css': 'styles/themes/theme.css',
        './styles/themes/video.css': 'styles/themes/video.css',
      },
      title: 'Video.js media theme',
      description: 'Editable media tokens, resets, preferences, presets, and Tailwind compiler integration.',
      docs: themeDocs(target),
      tailwind: target.styling === 'tailwind' ? './styles/tailwind.css' : undefined,
      meta,
    },
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
  };
}

/** Keep transitive CLI output compact; the customization guide owns the complete token and utility catalog. */
function themeDocs(target: RegistryTarget): string {
  const styling = target.styling === 'tailwind' ? 'Tailwind theme keys and utilities' : 'CSS variables';

  return `Installed automatically with Video.js skins and UI components. See [Customize skins](https://videojs.org/docs/how-to/customize-skins/) for the available ${styling}.`;
}
