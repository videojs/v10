import { describe, expect, it } from 'vitest';

import { renderInstallationCompatibilityMarkdown } from '../markdown';
import { installationCompatibilityFor } from '../options';

describe('renderInstallationCompatibilityMarkdown', () => {
  it('mentions the none app setup only for frameworks that offer it', () => {
    expect(renderInstallationCompatibilityMarkdown(installationCompatibilityFor(['react']))).not.toContain('`none`');
    expect(renderInstallationCompatibilityMarkdown(installationCompatibilityFor(['react', 'html']))).toContain(
      'The `none` app setup is available only for plain HTML'
    );
  });
});
