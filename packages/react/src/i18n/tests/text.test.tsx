import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Text } from '../text';

describe('Text', () => {
  afterEach(cleanup);

  it('uses children as the translation fallback', () => {
    render(<Text token="custom.label">Fallback</Text>);

    expect(screen.queryByText('Fallback')).not.toBeNull();
  });

  it('renders ordinary children without a token', () => {
    render(<Text>10</Text>);

    expect(screen.queryByText('10')).not.toBeNull();
  });
});
