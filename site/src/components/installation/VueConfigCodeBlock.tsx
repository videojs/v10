import {
  generateVueCustomElementConfigCode,
  installationProjectFiles,
  installationVueConfigFilename,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { focusLinesContaining } from '@/components/Code/focusLines';
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
    extensions: useSelection('extensions'),
  });
  const config = code[filename];

  return (
    <TabsRoot>
      <TabsList label="Build tool">
        <Tab value="config" initial>
          {project.config}
        </Tab>
      </TabsList>
      <TabsPanel value="config" initial>
        <ClientCode
          code={config}
          focusLines={focusLinesContaining(config, ['vue({', 'template:', 'compilerOptions:', 'isCustomElement:'])}
          lang={template === 'astro' ? 'js' : 'ts'}
        />
      </TabsPanel>
    </TabsRoot>
  );
}
