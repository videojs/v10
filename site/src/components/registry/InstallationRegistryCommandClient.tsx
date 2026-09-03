import { useStore } from '@nanostores/react';
import clsx from 'clsx';

import { shared } from '@/components/typography/styles';
import { installMethod, skin, useCase } from '@/stores/installation';
import { type RegistryFramework, registrySkinItem } from '@/utils/installation/shadcn';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The registry command for the skin the installation page's pickers chose, in the package manager chosen above. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $installMethod = useStore(installMethod);
  const item = registrySkinItem({ useCase: $useCase, skin: $skin });

  if (!item) {
    return (
      <p className={clsx(shared.p, shared.prose)}>
        {$useCase === 'background-video'
          ? 'The background video skin stays a package import; the registry publishes no editable source for it.'
          : 'Pick the Default or Minimal skin above to install its source.'}
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
