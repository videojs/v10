import type { RegistryStylesOptions } from '../../../../vjsc/src/shadcn/index.ts';
import type { VideojsRegistryMeta } from '../meta.ts';
import type { RegistryTarget } from '../targets.ts';

export function registryStyles(target: RegistryTarget): RegistryStylesOptions | undefined {
  if (target.framework === 'html' && target.styling === 'css') return undefined;

  const meta = {
    role: 'support',
    framework: target.framework,
    styling: target.styling,
    public: false,
  } satisfies VideojsRegistryMeta;

  return {
    theme: {
      target: 'styles/theme.css',
      include: ['./styles/base.css'],
      title: 'Video.js media theme',
      description: 'Scoped media tokens, resets, preferences, and Tailwind compiler integration.',
      docs: 'Installed automatically with Video.js skins and UI components.',
      tailwind: target.styling === 'tailwind' ? './styles/tailwind.shared.css' : undefined,
      meta,
    },
    files: target.framework === 'react' && target.styling === 'css' ? 'styles' : undefined,
  };
}
