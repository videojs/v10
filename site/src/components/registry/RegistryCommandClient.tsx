import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { registryStyling } from '@/stores/registry';
import {
  type RegistryFramework,
  registryInstallCommands,
  resolveRegistryStyling,
  SHADCN_RUNNERS,
  type ShadcnRunner,
} from '@/utils/installation/shadcn';

interface Props {
  framework: RegistryFramework;
  /** Registry item names, without the `@videojs/` namespace. Empty registers the namespace and installs nothing. */
  items: readonly string[];
  /** Show one package manager instead of tabs, for pages that already asked. */
  runner?: ShadcnRunner | undefined;
}

const RUNNERS = Object.keys(SHADCN_RUNNERS) as ShadcnRunner[];

/**
 * The Shadcn commands one install needs: `registry add` points the `@videojs` namespace at the styling catalog the
 * page's select box chose, then `add` installs the items.
 */
export default function RegistryCommandClient({ framework, items, runner }: Props) {
  const $styling = useStore(registryStyling);
  const styling = resolveRegistryStyling(framework, $styling);
  const runners = runner ? [runner] : RUNNERS;

  return (
    <TabsRoot>
      <TabsList label="Package manager">
        {runners.map((candidate, index) => (
          <Tab key={candidate} value={candidate} initial={index === 0}>
            {candidate}
          </Tab>
        ))}
      </TabsList>
      {runners.map((candidate, index) => (
        <TabsPanel key={candidate} value={candidate} initial={index === 0}>
          <ClientCode code={registryInstallCommands(candidate, framework, styling, items)} lang="bash" />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}
