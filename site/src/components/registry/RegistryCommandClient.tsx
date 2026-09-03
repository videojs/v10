import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { registryStyling } from '@/stores/registry';
import {
  REGISTRY_STYLING_LABELS,
  type RegistryFramework,
  registryComponentsJson,
  resolveRegistryStyling,
  SHADCN_RUNNERS,
  shadcnAddCommand,
  type ShadcnRunner,
} from '@/utils/installation/shadcn';

interface Props {
  framework: RegistryFramework;
  /** Registry item names, without the `@videojs/` namespace. */
  items: readonly string[];
  /** Show one package manager instead of tabs, for pages that already asked. */
  runner?: ShadcnRunner | undefined;
}

const RUNNERS = Object.keys(SHADCN_RUNNERS) as ShadcnRunner[];

/**
 * The two pieces every registry install needs: the `@videojs` namespace in `components.json`, pointed at the styling
 * catalog the page's select box chose, and the `add` command for the items.
 */
export default function RegistryCommandClient({ framework, items, runner }: Props) {
  const $styling = useStore(registryStyling);
  const styling = resolveRegistryStyling(framework, $styling);

  return (
    <div className="flex flex-col gap-4">
      <TabsRoot maxWidth={false}>
        <TabsList label={`${REGISTRY_STYLING_LABELS[styling]} registry namespace`}>
          <Tab value="components" initial>
            components.json
          </Tab>
        </TabsList>
        <TabsPanel value="components" initial>
          <ClientCode code={registryComponentsJson(framework, styling)} lang="json" />
        </TabsPanel>
      </TabsRoot>
      {runner ? (
        <TabsRoot maxWidth={false}>
          <TabsList label="Install command">
            <Tab value={runner} initial>
              {runner}
            </Tab>
          </TabsList>
          <TabsPanel value={runner} initial>
            <ClientCode code={shadcnAddCommand(runner, items)} lang="bash" />
          </TabsPanel>
        </TabsRoot>
      ) : (
        <TabsRoot maxWidth={false}>
          <TabsList label="Package manager">
            {RUNNERS.map((candidate, index) => (
              <Tab key={candidate} value={candidate} initial={index === 0}>
                {candidate}
              </Tab>
            ))}
          </TabsList>
          {RUNNERS.map((candidate, index) => (
            <TabsPanel key={candidate} value={candidate} initial={index === 0}>
              <ClientCode code={shadcnAddCommand(candidate, items)} lang="bash" />
            </TabsPanel>
          ))}
        </TabsRoot>
      )}
    </div>
  );
}
