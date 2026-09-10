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
      target: 'styles/theme.css',
      include: ['./styles/base.css', './styles/captions.css', './styles/themes/video.css', './styles/themes/audio.css'],
      title: 'Video.js media theme',
      description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
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
