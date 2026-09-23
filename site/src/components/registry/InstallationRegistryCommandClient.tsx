import { useSelection } from '@/components/installation/useSelection';
import { DEFAULT_REGISTRY_PRESET, type RegistryFramework, registrySkinSelection } from '@/utils/installation/shadcn';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The registry command for the skin the installation page's pickers chose. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const selection = registrySkinSelection({ useCase: $useCase, skin: $skin });

  return (
    <RegistryCommandClient
      defaultSkin={selection?.item ?? DEFAULT_REGISTRY_PRESET}
      framework={framework}
      items={[]}
      theme={selection?.theme ?? 'default'}
    />
  );
}
