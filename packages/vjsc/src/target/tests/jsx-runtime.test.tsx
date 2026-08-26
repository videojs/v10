/** @jsxImportSource ../ */

import { describe, expect, it } from 'vite-plus/test';

import { TARGET_HOST, TARGET_NODE } from '../definition';
import { Host } from '../jsx-runtime';

describe('target JSX runtime', () => {
  it('creates host nodes from JSX', () => {
    const node = <Host id="target-host">content</Host>;

    expect(node).toEqual({
      [TARGET_NODE]: true,
      type: TARGET_HOST,
      props: { id: 'target-host', children: 'content' },
      key: null,
    });
  });
});
