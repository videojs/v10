import { useStore } from '@nanostores/react';
import { type RegistryFramework, resolveRegistryTemplate, shadcnInitCommand } from '@videojs/installation';

import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import { registryTemplate } from '@/stores/registry';

interface Props {
  framework: RegistryFramework;
  installation: boolean;
}

export default function RegistryInitCommandClient({ framework, installation }: Props) {
  const $template = useStore(registryTemplate);
  const template = resolveRegistryTemplate(framework, $template);
  const commands = {
    npm: shadcnInitCommand('npm', template),
    pnpm: shadcnInitCommand('pnpm', template),
    yarn: shadcnInitCommand('yarn', template),
    bun: shadcnInitCommand('bun', template),
  };

  return <PackageManagerTabs commands={commands} syncSelection={installation} />;
}
