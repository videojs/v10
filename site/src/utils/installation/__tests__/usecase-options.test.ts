import { describe, expect, it } from 'vitest';
import { buildOptions, USE_CASE_LABELS } from '../usecase-options';

describe('buildOptions', () => {
  it('returns use cases in the configured order', () => {
    expect(buildOptions()).toEqual([
      { value: 'default-video', label: 'Video' },
      { value: 'default-audio', label: 'Audio' },
      { value: 'background-video', label: 'Background Video' },
    ]);
  });

  it('labels every use case', () => {
    for (const option of buildOptions()) {
      expect(option.label).toBe(USE_CASE_LABELS[option.value!]);
    }
  });
});
