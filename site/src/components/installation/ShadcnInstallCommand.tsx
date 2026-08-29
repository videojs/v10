import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { skin, useCase } from '@/stores/installation';
import {
  resolveShadcnInstallation,
  shadcnAddCommand,
  shadcnRegistryUrl,
  type ShadcnFramework,
} from '@/utils/installation/shadcn';

interface Props {
  framework: ShadcnFramework;
}

export default function ShadcnInstallCommand({ framework }: Props) {
  const $skin = useStore(skin);
  const $useCase = useStore(useCase);
  const selected = resolveShadcnInstallation({ useCase: $useCase, skin: $skin });

  if (selected.packageOnly) {
    return (
      <p>
        This selection stays package-managed. Choose Default or Minimal to install editable skin source from the
        registry.
      </p>
    );
  }

  const command = shadcnAddCommand(selected.item)!;

  return (
    <>
      <p>
        Configure the <code>@videojs</code> namespace once, then install the selected skin. The Player and media remain
        package imports.
      </p>
      <TabsRoot maxWidth={false}>
        <TabsList label="Editable source styling">
          <Tab value="tailwind" initial>
            Tailwind
          </Tab>
          <Tab value="css">Vanilla CSS</Tab>
        </TabsList>
        <TabsPanel value="tailwind" initial>
          <ClientCode
            code={JSON.stringify({ registries: { '@videojs': shadcnRegistryUrl(framework, 'tailwind') } }, null, 2)}
            lang="json"
          />
          <ClientCode code={command} lang="bash" />
        </TabsPanel>
        <TabsPanel value="css">
          <ClientCode
            code={JSON.stringify({ registries: { '@videojs': shadcnRegistryUrl(framework, 'css') } }, null, 2)}
            lang="json"
          />
          <ClientCode code={command} lang="bash" />
        </TabsPanel>
      </TabsRoot>
    </>
  );
}
