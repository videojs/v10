import { describe, expect, it } from 'vite-plus/test';

import { resolveInstallationFrameworkNavigation } from '../framework-navigation';

describe('resolveInstallationFrameworkNavigation', () => {
  it('replaces equivalent React and HTML installation pages', () => {
    expect(resolveInstallationFrameworkNavigation('react', 'html', '?preset=audio')).toEqual({
      target: '/docs/guides/installation/html?preset=audio',
      history: 'replace',
    });
  });

  it('pushes when entering or leaving a dedicated framework guide', () => {
    expect(resolveInstallationFrameworkNavigation('html', 'vue', '?media=hls')).toEqual({
      target: '/docs/guides/installation/vue?media=hls',
      history: 'push',
    });
    expect(resolveInstallationFrameworkNavigation('svelte', 'react', '')).toEqual({
      target: '/docs/guides/installation/react',
      history: 'push',
    });
  });
});
