import { type Locale, registerI18n, resetI18nRegistryForTesting, type Translator } from '@videojs/core/i18n';
import { ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { describe, expect, it } from 'vitest';

import { SkinElement } from '../../define/skin-element';
import { i18nContext, MediaTextElement } from '../index';

const skinTemplate = document.createElement('template');
skinTemplate.innerHTML =
  '<button aria-labelledby="settings-label"><media-text id="settings-label" key="menuSettings"></media-text></button>';

class TestSkinElement extends SkinElement {
  static override readonly template = skinTemplate;
}

class TestI18nProviderElement extends ReactiveElement {
  readonly provider = new ContextProvider(this, {
    context: i18nContext,
    initialValue: {
      translator: ((key: string) => (key === 'menuSettings' ? 'Ancestor settings' : key)) as Translator,
      locale: 'xx' as Locale,
    },
  });
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

describe('provider', () => {
  it('uses its own translator for shadow labels', async () => {
    resetI18nRegistryForTesting();
    registerI18n('xx', { menuSettings: 'Skin settings' });
    const root = document.createElement('div');
    root.innerHTML = /*html*/ `
      <test-skin-i18n-provider>
        <test-skin-i18n lang="xx"></test-skin-i18n>
      </test-skin-i18n-provider>
    `;
    document.body.append(root);

    const skin = root.querySelector<TestSkinElement>('test-skin-i18n')!;
    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    const button = skin.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-labelledby')).toBe('settings-label');
    expect(text.textContent).toBe('Skin settings');

    root.remove();
    resetI18nRegistryForTesting();
  });
});
