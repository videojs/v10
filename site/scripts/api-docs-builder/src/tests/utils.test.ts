import { describe, expect, it } from 'vitest';
import { kebabToPascal, partKebabFromSource, sortProps } from '../utils.js';

describe('kebabToPascal', () => {
  it("converts 'play-button' to 'PlayButton'", () => {
    expect(kebabToPascal('play-button')).toBe('PlayButton');
  });

  it("converts 'slider' to 'Slider'", () => {
    expect(kebabToPascal('slider')).toBe('Slider');
  });

  it("converts 'time-display-current' to 'TimeDisplayCurrent'", () => {
    expect(kebabToPascal('time-display-current')).toBe('TimeDisplayCurrent');
  });
});

describe('partKebabFromSource', () => {
  it("derives 'value' from './time-value' with component 'time'", () => {
    expect(partKebabFromSource('./time-value', 'time')).toBe('value');
  });

  it("derives 'group' from './time-group' with component 'time'", () => {
    expect(partKebabFromSource('./time-group', 'time')).toBe('group');
  });

  it("derives 'separator' from './time-separator' with component 'time'", () => {
    expect(partKebabFromSource('./time-separator', 'time')).toBe('separator');
  });

  it("handles multi-segment component names like 'play-button'", () => {
    expect(partKebabFromSource('./play-button-icon', 'play-button')).toBe('icon');
  });
});

describe('sortProps', () => {
  it('sorts required props before optional props', () => {
    const props = {
      optional: { type: 'string' },
      required: { type: 'string', required: true as const },
    };

    const result = sortProps(props);
    const keys = Object.keys(result);

    expect(keys).toEqual(['required', 'optional']);
  });

  it('sorts alphabetically within each group', () => {
    const props = {
      zebra: { type: 'string', required: true as const },
      apple: { type: 'string', required: true as const },
      mango: { type: 'string' },
      banana: { type: 'string' },
    };

    const result = sortProps(props);
    const keys = Object.keys(result);

    expect(keys).toEqual(['apple', 'zebra', 'banana', 'mango']);
  });

  it('keeps all-optional props alphabetical', () => {
    const props = {
      charlie: { type: 'string' },
      alpha: { type: 'string' },
      bravo: { type: 'string' },
    };

    const result = sortProps(props);
    const keys = Object.keys(result);

    expect(keys).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('keeps all-required props alphabetical', () => {
    const props = {
      charlie: { type: 'string', required: true as const },
      alpha: { type: 'string', required: true as const },
      bravo: { type: 'string', required: true as const },
    };

    const result = sortProps(props);
    const keys = Object.keys(result);

    expect(keys).toEqual(['alpha', 'bravo', 'charlie']);
  });
});
