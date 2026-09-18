import { describe, expect, it } from 'vite-plus/test';

import { getFrameworksForInstallationMethod, getInstallationMethodsForFramework } from '../method-options';

describe('getInstallationMethodsForFramework', () => {
  it('filters installation paths by framework support', () => {
    expect(getInstallationMethodsForFramework('react')).toEqual(['packaged', 'shadcn']);
    expect(getInstallationMethodsForFramework('html')).toEqual(['packaged', 'shadcn', 'cdn']);
    expect(getInstallationMethodsForFramework('vue')).toEqual(['packaged']);
    expect(getInstallationMethodsForFramework('svelte')).toEqual(['packaged']);
  });

  it('lists the frameworks supported by each installation path', () => {
    expect(getFrameworksForInstallationMethod('packaged')).toEqual(['react', 'html', 'vue', 'svelte']);
    expect(getFrameworksForInstallationMethod('shadcn')).toEqual(['react', 'html']);
    expect(getFrameworksForInstallationMethod('cdn')).toEqual(['html']);
  });
});
