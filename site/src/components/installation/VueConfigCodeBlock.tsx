import {
  generateVueCustomElementConfigCode,
  installationProjectFiles,
  installationVueConfigFilename,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';

import { useSelection } from './useSelection';

export default function VueConfigCodeBlock() {
  const template = useSelection('template');
  const project = installationProjectFiles('vue', template);
  const filename = installationVueConfigFilename(template);
  const code = generateVueCustomElementConfigCode({
    useCase: useSelection('useCase'),
    skin: useSelection('skin'),
    renderer: useSelection('renderer'),
  });

  return (
    <TabsRoot>
      <TabsList label="Build tool">
        <Tab value="config" initial>
          {project.config}
        </Tab>
      </TabsList>
      <TabsPanel value="config" initial>
        <ClientCode code={code[filename]} lang="ts" />
      </TabsPanel>
    </TabsRoot>
  );
}
