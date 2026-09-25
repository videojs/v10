import {
  generateReactCreateCode,
  installationProjectFiles,
  installationReactPlayerCode,
  installationReactUsageCode,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function ReactCreateCodeBlock() {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');
  const $extensions = useSelection('extensions');
  const $sourceUrl = useSelection('sourceUrl');
  const $template = useSelection('template');

  const result = generateReactCreateCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    extensions: $extensions,
    sourceUrl: $sourceUrl,
  });
  const files = installationProjectFiles('react', $template);
  const usage = installationReactUsageCode($template);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="player" initial>
          {files.player}
        </Tab>
        {files.usage && <Tab value="usage">{files.usage}</Tab>}
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={installationReactPlayerCode(result['app/page.tsx'], $template)} lang="tsx" />
      </TabsPanel>
      {files.usage && usage && (
        <TabsPanel value="usage">
          <ClientCode code={usage} lang="astro" />
        </TabsPanel>
      )}
    </TabsRoot>
  );
}
