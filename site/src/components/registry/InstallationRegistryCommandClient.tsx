import { useStore } from '@nanostores/react';
import clsx from 'clsx';

import { shared } from '@/components/typography/styles';
import { installMethod, skin, useCase } from '@/stores/installation';
import { type RegistryFramework, registrySkinSelection } from '@/utils/installation/shadcn';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The source-install command for the skin the installation page's pickers chose. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $installMethod = useStore(installMethod);
  const selection = registrySkinSelection({ useCase: $useCase, skin: $skin });

  if (!selection) {
    return (
      <p className={clsx(shared.p, shared.prose)}>
        {$useCase === 'background-video'
          ? 'The background video skin cannot be ejected.'
          : 'Select the Default or Minimal skin above to copy its source.'}
      </p>
    );
  }

  return (
    <RegistryCommandClient
      framework={framework}
      items={[selection.item]}
      runner={$installMethod === 'cdn' ? 'npm' : $installMethod}
      theme={selection.theme}
    />
  );
}
