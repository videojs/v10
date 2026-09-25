import { generateVueCreateCode, installationProjectFiles } from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

function VueCreateCodeBlock() {
  const template = useSelection('template');
  const useCase = useSelection('useCase');
  const project = installationProjectFiles('vue', template, useCase);
  const code = generateVueCreateCode({
    useCase,
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
    extensions: useSelection('extensions'),
  });

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="Vue implementation">
        <Tab value="player" initial>
          {project.player}
        </Tab>
      </TabsList>
      <TabsPanel value="player" initial>
        <ClientCode code={code.component} lang="html" />
      </TabsPanel>
    </TabsRoot>
  );
}

export default withSelectionMarker(VueCreateCodeBlock);
