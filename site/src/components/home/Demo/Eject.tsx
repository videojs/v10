import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Skin } from '@/stores/homePageDemos';
import { framework, skin } from '@/stores/homePageDemos';
import ClientCode from '../../Code/ClientCode';

function generateReactCode(skin: Skin): string {
  return `react`;
}

function generateReactCSS(skin: Skin): string {
  return `css`;
}

function generateHTMLCode(skin: Skin): string {
  return `html`;
}

function generateCSS(skin: Skin): string {
  return `css`;
}

function generateJS(skin: Skin): string {
  return `js`;
}

export default function EjectDemo({ className }: { className?: string }) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  if ($framework === 'html') {
    return (
      <TabsRoot variant="expanded" key={$framework} className={className} maxWidth={false}>
        <TabsList variant="expanded" label="HTML implementation">
          <Tab variant="expanded" value="html" initial>
            HTML
          </Tab>
          <Tab variant="expanded" value="css">
            CSS
          </Tab>
          <Tab variant="expanded" value="javascript">
            <span className="sm:hidden">JS</span>
            <span className="hidden sm:inline">JavaScript</span>
          </Tab>
        </TabsList>
        <TabsPanel variant="expanded" value="html" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
        <TabsPanel variant="expanded" value="css" className="bg-faded-black dark:bg-soot m-2.5 mt-0">
          <ClientCode code={generateCSS($skin)} lang="css" />
        </TabsPanel>
        <TabsPanel variant="expanded" value="javascript" className="bg-faded-black dark:bg-soot m-2.5 mt-0">
          <ClientCode code={generateJS($skin)} lang="javascript" />
        </TabsPanel>
      </TabsRoot>
    );
  }

  return (
    <TabsRoot variant="expanded" key={$framework} className={className} maxWidth={false}>
      <TabsList variant="expanded" label="React implementation">
        <Tab variant="expanded" value="react" initial>
          React
        </Tab>
        <Tab variant="expanded" value="css">
          CSS
        </Tab>
      </TabsList>
      <TabsPanel variant="expanded" value="react" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        <ClientCode code={generateReactCode($skin)} lang="tsx" />
      </TabsPanel>
      <TabsPanel variant="expanded" value="css" className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        <ClientCode code={generateReactCSS($skin)} lang="css" />
      </TabsPanel>
    </TabsRoot>
  );
}
