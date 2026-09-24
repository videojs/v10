import {
  generateSourceReactCreateCode,
  installationProjectFiles,
  installationReactPlayerCode,
  installationReactUsageCode,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from '../installation/useSelection';

export default function SourceReactPlayer() {
  const template = useSelection('template');
  const project = installationProjectFiles('react', template);
  const code = generateSourceReactCreateCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
    componentsAlias: project.componentsAlias,
  });
  const usage = installationReactUsageCode(template);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="player" initial>
          {project.player}
        </Tab>
        {project.usage && <Tab value="usage">{project.usage}</Tab>}
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={installationReactPlayerCode(code['app/page.tsx'], template)} lang="tsx" />
      </TabsPanel>
      {project.usage && usage && (
        <TabsPanel value="usage">
          <ClientCode code={usage} lang="astro" />
        </TabsPanel>
      )}
    </TabsRoot>
  );
}
