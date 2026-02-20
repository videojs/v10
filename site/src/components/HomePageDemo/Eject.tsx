import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import type { Skin } from '@/stores/homePageDemos';
import { framework, skin } from '@/stores/homePageDemos';
import {
  generateHTMLCSS,
  generateHTMLJS,
  generateHTMLMarkup,
  generateReactComponent,
  generateReactCSS as genReactCSS,
} from '@/utils/ejectCodeGenerator';
import ClientCode from '../Code/ClientCode';

function generateReactCode(skin: Skin): string {
  return generateReactComponent(skin);
}

function generateReactCSS(skin: Skin): string {
  return genReactCSS(skin);
}

function generateHTMLCode(skin: Skin): string {
  return generateHTMLMarkup(skin);
}

function generateCSS(skin: Skin): string {
  return generateHTMLCSS(skin);
}

function generateJS(skin: Skin): string {
  return generateHTMLJS(skin);
}

export default function EjectDemo({ className }: { className?: string }) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  const tabCodeContent = 'bg-faded-black scrollbar-white m-1 mt-0';

  if ($framework === 'html') {
    return (
      <TabsRoot key={$framework} className={className} maxWidth={false}>
        <TabsList label="HTML implementation">
          <Tab value="html" initial>
            HTML
          </Tab>
          <Tab value="css">CSS</Tab>
          <Tab value="javascript">
            <span className="sm:hidden">JS</span>
            <span className="hidden sm:inline">JavaScript</span>
          </Tab>
        </TabsList>
        <TabsPanel value="html" initial className={tabCodeContent}>
          <ClientCode code={generateHTMLCode($skin)} lang="html" />
        </TabsPanel>
        <TabsPanel value="css" className={tabCodeContent}>
          <ClientCode code={generateCSS($skin)} lang="css" />
        </TabsPanel>
        <TabsPanel value="javascript" className={tabCodeContent}>
          <ClientCode code={generateJS($skin)} lang="javascript" />
        </TabsPanel>
      </TabsRoot>
    );
  }

  return (
    <TabsRoot key={$framework} className={className} maxWidth={false}>
      <TabsList label="React implementation">
        <Tab value="react" initial>
          React
        </Tab>
        <Tab value="css">CSS</Tab>
      </TabsList>
      <TabsPanel value="react" initial className={tabCodeContent}>
        <ClientCode code={generateReactCode($skin)} lang="tsx" />
      </TabsPanel>
      <TabsPanel value="css" className={tabCodeContent}>
        <ClientCode code={generateReactCSS($skin)} lang="css" />
      </TabsPanel>
    </TabsRoot>
  );
}
