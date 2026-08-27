/** @jsxImportSource ../ */

import { describe, expect, it } from 'vite-plus/test';

import { TARGET_EXPRESSION, TARGET_HOST, TARGET_NODE, TARGET_SPREAD } from '../definition';
import { createTargetCode } from '../expression';
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

  it('retains generated bindings spread through target JSX', () => {
    const props = createTargetCode().param('props');
    const node = <Host {...props}>content</Host>;

    expect(node.props[TARGET_SPREAD]).toEqual({ [TARGET_EXPRESSION]: props[TARGET_EXPRESSION] });
  });
});
