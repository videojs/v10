import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { useSelection } from '@/components/installation/useSelection';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { registryTemplate } from '@/stores/registry';
import {
  defaultRegistryTemplate,
  type RegistryFramework,
  SHADCN_RUNNER_NAMES,
  shadcnInitCommand,
  type ShadcnRunner,
} from '@/utils/installation/shadcn';

interface Props {
  framework: RegistryFramework;
  installation: boolean;
}

export default function RegistryInitCommandClient({ framework, installation }: Props) {
  const $template = useStore(registryTemplate);
  const installMethod = useSelection('installMethod');
  const template = $template ?? defaultRegistryTemplate(framework);
  const selectedRunner: ShadcnRunner = installMethod === 'cdn' ? 'npm' : installMethod;
  const runners: readonly ShadcnRunner[] = installation ? [selectedRunner] : SHADCN_RUNNER_NAMES;

  return (
    <TabsRoot>
      <TabsList label="Package manager">
        {runners.map((runner, index) => (
          <Tab key={runner} value={runner} initial={index === 0}>
            {runner}
          </Tab>
        ))}
      </TabsList>
      {runners.map((runner, index) => (
        <TabsPanel key={runner} value={runner} initial={index === 0}>
          <ClientCode code={shadcnInitCommand(runner, template)} lang="bash" />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}
