import { describe, expect, it } from 'vitest';
import { safeDefine } from '../safe-define';

describe('safeDefine', () => {
  it('registers a custom element', () => {
    class TestElement extends HTMLElement {
      static tagName = 'test-sd-register';
    }

    expect(customElements.get('test-sd-register')).toBeUndefined();
    safeDefine(TestElement);
    expect(customElements.get('test-sd-register')).toBe(TestElement);
  });

  it('does not throw when element is already registered', () => {
    class TestElement extends HTMLElement {
      static tagName = 'test-sd-no-throw';
    }

    customElements.define('test-sd-no-throw', TestElement);
    expect(() => safeDefine(TestElement)).not.toThrow();
  });

  it('does not replace an existing registration', () => {
    class Original extends HTMLElement {
      static tagName = 'test-sd-no-replace';
    }
    class Replacement extends HTMLElement {
      static tagName = 'test-sd-no-replace';
    }

    safeDefine(Original);
    safeDefine(Replacement);
    expect(customElements.get('test-sd-no-replace')).toBe(Original);
  });
});
