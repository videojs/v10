import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { registryFramework } from '@/stores/registry';

vi.mock('@/components/CardRadioGroup', () => ({
  default: ({ value }: { value: string }) => <span data-testid="framework">{value}</span>,
}));

import ShadcnFrameworkSelect from './ShadcnFrameworkSelect';

describe('ShadcnFrameworkSelect', () => {
  afterEach(() => registryFramework.set('react'));

  it('uses the route default for server markup when the client store differs', () => {
    registryFramework.set('html');

    expect(renderToString(<ShadcnFrameworkSelect />)).toContain('data-testid="framework">react</span>');
  });
});
