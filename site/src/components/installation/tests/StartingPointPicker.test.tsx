import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@/components/CardRadioGroup', () => ({
  default: ({
    options,
    value,
  }: {
    options: Array<{ description: string; disabled?: boolean; label: string }>;
    value: string;
  }) => (
    <div data-disabled={options.filter(({ disabled }) => disabled).map(({ label }) => label)}>
      <span>{value}</span>
      {options.map(({ description, label }) => (
        <span key={label}>{`${label}: ${description}`}</span>
      ))}
    </div>
  ),
}));

import StartingPointPicker from '../StartingPointPicker';

describe('StartingPointPicker', () => {
  it('starts from an existing project', () => {
    const markup = renderToString(<StartingPointPicker serverTemplate="vite" />);

    expect(markup).toContain('>existing</span>');
    expect(markup).toContain('New project: Create a new app');
    expect(markup).toContain('Existing project: Add to an existing app');
  });

  it('disables a new project for Existing site', () => {
    expect(renderToString(<StartingPointPicker serverTemplate="none" />)).toContain('data-disabled="New project"');
  });
});
