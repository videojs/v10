import { useStore } from '@nanostores/react';
import clsx from 'clsx';

import { shared } from '@/components/typography/styles';
import { installMethod, skin, useCase } from '@/stores/installation';
import { type RegistryFramework, registrySkinItem } from '@/utils/installation/shadcn';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The source-install command for the skin the installation page's pickers chose. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $installMethod = useStore(installMethod);
  const item = registrySkinItem({ useCase: $useCase, skin: $skin });

  if (!item) {
    return (
      <p className={clsx(shared.p, shared.prose)}>
        {$useCase === 'background-video'
          ? 'The background video skin has no installable source.'
          : 'Select the Default or Minimal skin above to copy its source.'}
      </p>
    );
  }

  return (
    <RegistryCommandClient
      framework={framework}
      items={[item]}
      runner={$installMethod === 'cdn' ? 'npm' : $installMethod}
    />
  );
}
