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

  const shared = {
    docs: themeDocs(target),
    meta,
  } satisfies Pick<NonNullable<RegistryStylesOptions['theme']>, 'docs' | 'meta'>;

  return {
    theme: {
      ...shared,
      name: '_style-theme',
      target: 'styles/base.css',
      files: {
        './styles/base.css': 'styles/base.css',
        './styles/themes/preferences.css': 'styles/themes/preferences.css',
        './styles/themes/theme.css': 'styles/themes/theme.css',
      },
      title: 'Video.js media theme',
      description: 'Editable shared media tokens, resets, preferences, and Tailwind compiler integration.',
      tailwind: target.styling === 'tailwind' ? './styles/tailwind.css' : undefined,
    },
    themes: [
      {
        ...shared,
        name: '_style-minimal',
        target: 'styles/themes/minimal.css',
        files: { './styles/themes/minimal.css': 'styles/themes/minimal.css' },
        title: 'Video.js Minimal theme',
        description: 'Editable token overrides used only by Minimal skins.',
      },
      {
        ...shared,
        name: '_style-video',
        target: 'styles/video/base.css',
        files: {
          './styles/video/base.css': 'styles/video/base.css',
          './styles/video/captions.css': 'styles/video/captions.css',
          './styles/video/theme.css': 'styles/video/theme.css',
        },
        title: 'Video.js video styles',
        description: 'Editable resets and token overrides used only by video skins.',
        registryDependencies: ['@videojs/_style-theme'],
      },
      {
        ...shared,
        name: '_style-video-minimal',
        target: 'styles/video/minimal.css',
        files: { './styles/video/minimal.css': 'styles/video/minimal.css' },
        title: 'Video.js Minimal video styles',
        description: 'Minimal video stylesheet entry.',
        registryDependencies: ['@videojs/_style-minimal', '@videojs/_style-video'],
      },
      {
        ...shared,
        name: '_style-audio',
        target: 'styles/audio/base.css',
        files: {
          './styles/audio/base.css': 'styles/audio/base.css',
          './styles/audio/theme.css': 'styles/audio/theme.css',
        },
        title: 'Video.js audio styles',
        description: 'Editable resets and token overrides used only by audio skins.',
        registryDependencies: ['@videojs/_style-theme'],
      },
      {
        ...shared,
        name: '_style-audio-minimal',
        target: 'styles/audio/minimal.css',
        files: { './styles/audio/minimal.css': 'styles/audio/minimal.css' },
        title: 'Video.js Minimal audio styles',
        description: 'Minimal audio stylesheet entry.',
        registryDependencies: ['@videojs/_style-audio', '@videojs/_style-minimal'],
      },
    ],
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
  };
}

/** Keep transitive CLI output compact; the customization guide owns the complete token and utility catalog. */
function themeDocs(target: RegistryTarget): string {
  const styling = target.styling === 'tailwind' ? 'Tailwind theme keys and utilities' : 'CSS variables';

  return `Installed automatically with Video.js skins and UI components. See [Customize skins](https://videojs.org/docs/how-to/customize-skins/) for the available ${styling}.`;
}
