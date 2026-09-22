import { describe, expect, it } from 'vite-plus/test';

import { getInstallationMethodsForFramework } from '../method-options';

describe('getInstallationMethodsForFramework', () => {
  it('filters installation paths by framework support', () => {
    expect(getInstallationMethodsForFramework('react')).toEqual(['packaged', 'shadcn']);
    expect(getInstallationMethodsForFramework('html')).toEqual(['packaged', 'shadcn', 'cdn']);
    expect(getInstallationMethodsForFramework('vue')).toEqual(['packaged', 'shadcn']);
    expect(getInstallationMethodsForFramework('svelte')).toEqual(['packaged', 'shadcn']);
  });
});
