import {
  defaultInstallationTemplate,
  generateSourceHTMLUsageCode,
  generateSourceSvelteUsageCode,
  generateSourceVueUsageCode,
  installationHtmlEntrySetup,
  installationHtmlPageCode,
  installationProjectFiles,
  installationVueConfigFilename,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { focusLinesContaining } from '@/components/Code/focusLines';
import {
  useInstallationTemplate,
  useRegistryProjectFramework,
} from '@/components/installation/useRegistryProjectFramework';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';

import { useSelection } from '../installation/useSelection';

type SourceHTMLPlayerPart = 'imports' | 'media' | 'player';

interface Props {
  part: SourceHTMLPlayerPart;
}

interface CodeTab {
  code: string;
  focusLines?: readonly number[];
  label: string;
  lang: 'astro' | 'html' | 'js' | 'json' | 'ts';
  value: string;
}

function CodeTabs({ label, tabs }: { label: string; tabs: readonly CodeTab[] }) {
  return (
    <TabsRoot maxWidth={false}>
      <TabsList label={label}>
        {tabs.map((tab, index) => (
          <Tab key={tab.value} value={tab.value} initial={index === 0}>
            {tab.label}
          </Tab>
        ))}
      </TabsList>
      {tabs.map((tab, index) => (
        <TabsPanel key={tab.value} value={tab.value} initial={index === 0}>
          <ClientCode code={tab.code} focusLines={tab.focusLines} lang={tab.lang} />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}

export default function SourceHTMLPlayer({ part }: Props) {
  const projectFramework = useRegistryProjectFramework('html');
  const template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const useCase = useSelection('useCase');
  const project = installationProjectFiles(projectFramework, template, useCase);
  const options = {
    useCase,
    renderer: useSelection('renderer'),
    sourceUrl: useSelection('sourceUrl'),
    componentsAlias: project.componentsImportAlias ?? project.componentsAlias,
    componentsDirectory: project.componentsDirectory,
    playerImport: project.playerImport,
  };
  const html = generateSourceHTMLUsageCode(options);

  if (part === 'media') {
    if (projectFramework === 'vue') {
      const vue = generateSourceVueUsageCode(options);

      return (
        <>
          <p className={`${shared.p} ${shared.prose}`}>
            Move all markup from <code>{vue.sourceSkinFile}</code> into <code>{vue.skinFile}</code> inside a{' '}
            <code>&lt;template&gt;</code> block. Then replace the “Add a compatible media element here” comment with the
            slot below. For video skins, remove the inline <code>style</code> from the root{' '}
            <code>&lt;media-container&gt;</code> and add the style block outside <code>&lt;template&gt;</code>. The app
            supplies the media and its <code>src</code> later.
          </p>
          <CodeTabs
            label="Skin source"
            tabs={[{ code: '<slot />', label: vue.skinFile, lang: 'html', value: 'skin' }]}
          />
          {vue.skinStyle && (
            <CodeTabs
              label="Skin styles"
              tabs={[{ code: vue.skinStyle, label: vue.skinFile, lang: 'html', value: 'styles' }]}
            />
          )}
        </>
      );
    }

    if (projectFramework === 'svelte') {
      const svelte = generateSourceSvelteUsageCode(options);

      return (
        <>
          <p className={`${shared.p} ${shared.prose}`}>
            Move all markup from <code>{svelte.sourceSkinFile}</code> into <code>{svelte.skinFile}</code>. Then replace
            the “Add a compatible media element here” comment with the slot below. For video skins, remove the inline{' '}
            <code>style</code> from the root <code>&lt;media-container&gt;</code> and add the style block below. The app
            supplies the media and its <code>src</code> later.
          </p>
          <CodeTabs
            label="Skin source"
            tabs={[{ code: '<slot />', label: svelte.skinFile, lang: 'html', value: 'skin' }]}
          />
          {svelte.skinStyle && (
            <CodeTabs
              label="Skin styles"
              tabs={[{ code: svelte.skinStyle, label: svelte.skinFile, lang: 'html', value: 'styles' }]}
            />
          )}
        </>
      );
    }

    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          In <code>{html.skinFile}</code>, replace the “Add a compatible media element here” comment with:
        </p>
        <CodeTabs
          label="Skin source"
          tabs={[{ code: html.media, label: html.skinFile, lang: 'html', value: 'skin' }]}
        />
      </>
    );
  }

  if (part === 'imports') {
    if (projectFramework === 'vue') {
      const vue = generateSourceVueUsageCode(options);

      return (
        <>
          <p className={`${shared.p} ${shared.prose}`}>
            Vue treats unknown tags as Vue components. Merge the matching <code>isCustomElement</code> option into your
            existing config, keeping its other plugins and aliases.
          </p>
          <CodeTabs
            label="Vue toolchain"
            tabs={[
              {
                code: vue[installationVueConfigFilename(template)],
                focusLines: focusLinesContaining(vue[installationVueConfigFilename(template)], [
                  'isCustomElement',
                  'compilerOptions:',
                  'template:',
                  'vue({',
                ]),
                label: project.config!,
                lang: template === 'astro' ? 'js' : 'ts',
                value: 'config',
              },
            ]}
          />
        </>
      );
    }

    if (projectFramework === 'svelte') {
      return (
        <p className={`${shared.p} ${shared.prose}`}>
          Svelte passes hyphenated custom-element tags to the browser, so it does not need compiler configuration. The
          imports in the next step register the player, media, and installed skin.
        </p>
      );
    }

    const entrySetup = installationHtmlEntrySetup(template, project.usage!);

    return (
      <>
        {entrySetup.map((block) => (
          <div key={block.filename}>
            <p className={`${shared.p} ${shared.prose}`}>
              Merge the player entry into <code>{block.filename}</code>, keeping its other inputs, plugins, and options:
            </p>
            <CodeTabs
              label="App configuration"
              tabs={[
                {
                  code: block.code,
                  focusLines: focusLinesContaining(block.code, [
                    'import ',
                    'plugins:',
                    'input:',
                    'laravel({',
                    'resolve:',
                    'alias:',
                  ]),
                  label: block.filename,
                  lang: block.language,
                  value: 'entry',
                },
              ]}
            />
          </div>
        ))}
        <p className={`${shared.p} ${shared.prose}`}>
          Create <code>{project.usage}</code> and import the player, media, and installed skin:
        </p>
        <CodeTabs
          label="HTML implementation"
          tabs={[{ code: html.imports, label: project.usage!, lang: 'ts', value: 'imports' }]}
        />
      </>
    );
  }

  if (projectFramework === 'vue') {
    const vue = generateSourceVueUsageCode(options);

    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          Import the player, skin registration, and local Vue skin component, then render the player in your app. Nuxt
          uses a client-only player component so hydration does not replace the custom-element markup.
        </p>
        <CodeTabs
          label="Vue component"
          tabs={[
            {
              code: vue.component,
              label: project.player,
              lang: 'html',
              value: 'player',
            },
          ]}
        />
        <CodeTabs
          label="Vue usage"
          tabs={[
            {
              code: template === 'astro' ? vue['index.astro'] : vue['App.vue'],
              label: project.usage!,
              lang: template === 'astro' ? 'astro' : 'html',
              value: 'app',
            },
          ]}
        />
      </>
    );
  }

  if (projectFramework === 'svelte') {
    const svelte = generateSourceSvelteUsageCode(options);

    return (
      <>
        <p className={`${shared.p} ${shared.prose}`}>
          Import the player, skin registration, and local Svelte skin component, then render the player from Astro,
          SvelteKit, or a Vite app.
        </p>
        <CodeTabs
          label="Svelte component"
          tabs={[
            {
              code: svelte.component,
              label: project.player,
              lang: 'html',
              value: 'player',
            },
          ]}
        />
        <CodeTabs
          label="Svelte app"
          tabs={[
            {
              code:
                template === 'astro'
                  ? svelte['index.astro']
                  : template === 'sveltekit'
                    ? svelte['+page.svelte']
                    : svelte['App.svelte'],
              label: project.usage!,
              lang: template === 'astro' ? 'astro' : 'html',
              value: 'usage',
            },
          ]}
        />
      </>
    );
  }

  return (
    <>
      <p className={`${shared.p} ${shared.prose}`}>
        Paste the updated skin markup inside the player, then load the entry module:
      </p>
      <CodeTabs
        label="HTML implementation"
        tabs={[
          {
            code: installationHtmlPageCode(html.player, template, project.usage!),
            label: project.player,
            lang: 'html',
            value: 'player',
          },
        ]}
      />
    </>
  );
}
