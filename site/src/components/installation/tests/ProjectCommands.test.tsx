import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';

import ProjectCommands from '../ProjectCommands';

vi.mock('../PackageManagerTabs', () => ({
  default: ({ commands }: { commands: Record<string, string> }) => <pre>{commands.pnpm}</pre>,
}));

describe('ProjectCommands', () => {
  it('server-renders the route framework instead of the React default', () => {
    const vue = renderToString(<ProjectCommands part="create" serverFramework="vue" serverTemplate="vite" />);
    const svelte = renderToString(<ProjectCommands part="create" serverFramework="svelte" serverTemplate="vite" />);

    expect(vue).toContain('--template vue-ts');
    expect(svelte).toContain('--template svelte-ts');
    expect(vue).not.toContain('next-app');
    expect(svelte).not.toContain('next-app');
  });

  it('lets Shadcn create a new React and Tailwind app', () => {
    const markup = renderToString(
      <ProjectCommands method="shadcn" part="create" serverFramework="react" serverTemplate="next" />
    );

    expect(markup).toContain('shadcn@latest init --template next');
    expect(markup).not.toContain('create next-app');
  });

  it('only scaffolds Astro for a new project', () => {
    const markup = renderToString(<ProjectCommands part="create" serverFramework="react" serverTemplate="astro" />);

    expect(markup).toContain('create astro');
    expect(markup).not.toContain('astro add react --yes');
    expect(markup).not.toContain('Continue in the existing');
  });

  it('creates Astro apps with Vue or Svelte', () => {
    const vue = renderToString(<ProjectCommands part="create" serverFramework="vue" serverTemplate="astro" />);
    const svelte = renderToString(<ProjectCommands part="create" serverFramework="svelte" serverTemplate="astro" />);

    expect(vue).toContain('--add vue');
    expect(vue).not.toContain('astro add vue --yes');
    expect(svelte).toContain('--add svelte');
    expect(svelte).not.toContain('astro add svelte --yes');
  });

  it('shows the selected app setup development command for either starting point', () => {
    const markup = renderToString(<ProjectCommands part="run" serverFramework="react" serverTemplate="start" />);

    expect(markup).toContain('pnpm dev');
    expect(markup).not.toContain('existing development or preview command');
  });
});
