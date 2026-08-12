import type { StateAttrMap } from '@videojs/core';
import { ContextConsumer, ContextProvider, createContext } from '@videojs/element/context';
import { afterEach, describe, expect, it } from 'vitest';

import { ContextPartElement, type PartContextValue } from '../context-part-element';
import { MediaElement } from '../media-element';

interface TestState {
  active: boolean;
  orientation: 'horizontal' | 'vertical';
}

const state: TestState = { active: true, orientation: 'horizontal' };
const stateAttrMap = {
  active: 'data-active',
  orientation: 'data-orientation',
} as const satisfies StateAttrMap<TestState>;
const context = createContext<PartContextValue<TestState>>(Symbol('test-context-part'));

class TestProviderElement extends MediaElement {
  readonly provider = new ContextProvider(this, {
    context,
    initialValue: { state, stateAttrMap },
  });
}

class TestPartElement extends ContextPartElement<TestState> {
  protected readonly consumer = new ContextConsumer(this, { context, subscribe: true });
}

customElements.define('test-context-part-provider', TestProviderElement);
customElements.define('test-context-part', TestPartElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ContextPartElement', () => {
  it('applies initial context state synchronously on connection', () => {
    const provider = document.createElement('test-context-part-provider');
    const part = document.createElement('test-context-part');
    provider.append(part);
    document.body.append(provider);

    expect(part.getAttribute('data-active')).toBe('');
    expect(part.getAttribute('data-orientation')).toBe('horizontal');
  });
});
