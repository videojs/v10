import type { AstroIntegration } from 'astro';

// Astro loads this config while Vite+ discovers the workspace task graph, before `@videojs/installation` is built.
// Discovery never runs the hooks that render Markdown, so a renderer that cannot load yet only fails those hooks.
const renderer = await import('./llms-markdown').catch((loadError) => ({ loadError }));

export default function llmsMarkdown(): AstroIntegration {
  if ('default' in renderer) return renderer.default();

  const fail = () => {
    throw renderer.loadError;
  };

  return {
    name: 'llms-markdown',
    hooks: { 'astro:server:setup': fail, 'astro:build:done': fail },
  };
}
