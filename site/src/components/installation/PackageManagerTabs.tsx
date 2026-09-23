import { SHADCN_RUNNER_NAMES, type ShadcnRunner } from '@videojs/installation';
import { useEffect } from 'react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { installMethod } from '@/stores/installation';

import { useSelection } from './useSelection';

interface Props {
  commands: Record<ShadcnRunner, string>;
  syncSelection?: boolean;
}

/** Show install commands and, on installation pages, keep every command island on the same package manager. */
export default function PackageManagerTabs({ commands, syncSelection = true }: Props) {
  const $installMethod = useSelection('installMethod');
  const selectedRunner: ShadcnRunner = $installMethod === 'cdn' ? 'npm' : $installMethod;

  useEffect(() => {
    // Package-manager tabs cannot select CDN, so normalize the shared selection before synchronizing command islands.
    if (syncSelection && installMethod.get() === 'cdn') installMethod.set('npm');
  }, [syncSelection]);

  return (
    <TabsRoot>
      <TabsList label="Package manager">
        {SHADCN_RUNNER_NAMES.map((runner) => (
          <Tab
            key={runner}
            value={runner}
            initial={runner === selectedRunner}
            onSelect={syncSelection ? () => installMethod.set(runner) : undefined}
          >
            {runner}
          </Tab>
        ))}
      </TabsList>
      {SHADCN_RUNNER_NAMES.map((runner) => (
        <TabsPanel key={runner} value={runner} initial={runner === selectedRunner}>
          <ClientCode code={commands[runner]} lang="bash" />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}
