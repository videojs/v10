import { describe, expect, it } from 'vite-plus/test';

import { focusLinesContaining } from '../focusLines';

describe('focusLinesContaining', () => {
  it('returns one-based lines that contain any key fragment', () => {
    const code = `export default {
  plugins: [],
  resolve: {
    alias: {},
  },
};`;

    expect(focusLinesContaining(code, ['plugins:', 'alias:'])).toEqual([2, 4]);
  });
});
