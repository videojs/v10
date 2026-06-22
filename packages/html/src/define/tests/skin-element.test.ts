import { type Locale, registerI18n, resetI18nRegistryForTesting, type Translator } from '@videojs/core/i18n';
import { ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it } from 'vitest';

import { context } from '../../i18n/instance';
import { SkinElement } from '../skin-element';

const skinTemplate = document.createElement('template');
skinTemplate.innerHTML = '<button data-i18n-aria-label="menuSettings"></button>';

class TestSkinElement extends SkinElement {
  static override readonly template = skinTemplate;
}

class TestI18nProviderElement extends ReactiveElement {
  readonly #provider = new ContextProvider(this, {
    context,
    initialValue: {
      translator: ((key: string) => (key === 'menuSettings' ? 'Ancestor settings' : key)) as Translator,
      locale: 'xx' as Locale,
    },
  });

  override connectedCallback(): void {
    super.connectedCallback();
    void this.#provider;
  }
}

if (!customElements.get('test-skin-i18n')) {
  customElements.define('test-skin-i18n', TestSkinElement);
}

if (!customElements.get('test-skin-i18n-provider')) {
  customElements.define('test-skin-i18n-provider', TestI18nProviderElement);
}

afterEach(() => {
  resetI18nRegistryForTesting();
  document.body.innerHTML = '';
});

describe('SkinElement', () => {
  it('uses its own translator for shadow aria labels', async () => {
    registerI18n('xx', { menuSettings: 'Skin settings' });
    document.body.innerHTML = /*html*/ `
      <test-skin-i18n-provider>
        <test-skin-i18n lang="xx"></test-skin-i18n>
      </test-skin-i18n-provider>
    `;

    const skin = document.querySelector<TestSkinElement>('test-skin-i18n')!;
    await skin.updateComplete;

    const button = skin.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Skin settings');
  });
});
