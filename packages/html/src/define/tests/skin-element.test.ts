import { type Locale, registerI18n, resetI18nRegistryForTesting, type Translator } from '@videojs/core/i18n';
import { ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it } from 'vitest';

import { MediaTextElement } from '../../i18n/elements';
import { context } from '../../i18n/instance';
import { SkinElement } from '../skin-element';

const skinTemplate = document.createElement('template');
skinTemplate.innerHTML =
  '<button aria-labelledby="settings-label"><media-text id="settings-label" key="menuSettings"></media-text></button>';

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

if (!customElements.get(MediaTextElement.tagName)) {
  customElements.define(MediaTextElement.tagName, MediaTextElement);
}

afterEach(() => {
  resetI18nRegistryForTesting();
  document.body.innerHTML = '';
});

describe('SkinElement', () => {
  it('uses its own translator for shadow labels', async () => {
    registerI18n('xx', { menuSettings: 'Skin settings' });
    document.body.innerHTML = /*html*/ `
      <test-skin-i18n-provider>
        <test-skin-i18n lang="xx"></test-skin-i18n>
      </test-skin-i18n-provider>
    `;

    const skin = document.querySelector<TestSkinElement>('test-skin-i18n')!;
    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    const button = skin.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-labelledby')).toBe('settings-label');
    expect(text.textContent).toBe('Skin settings');
  });
});
