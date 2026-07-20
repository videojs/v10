import { type Locale, registerI18n, resetI18nRegistry, type Translator } from '@videojs/core/i18n';
import { type PropertyValues, ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SkinElement } from '../../define/skin-element';
import { i18nContext, MediaI18nProviderElement, MediaTextElement } from '../index';

const skinTemplate = document.createElement('template');
skinTemplate.innerHTML =
  '<button aria-labelledby="settings-label"><media-text id="settings-label">Settings</media-text></button>';

const missingKeyTemplate = document.createElement('template');
missingKeyTemplate.innerHTML =
  '<button aria-labelledby="missing-label"><media-text id="missing-label">missingLabel</media-text></button>';

const childTextTemplate = document.createElement('template');
childTextTemplate.innerHTML =
  '<button aria-labelledby="fallback-label"><media-text id="fallback-label">Fallback label</media-text></button>';

const firstUpdateTemplate = document.createElement('template');
firstUpdateTemplate.innerHTML = '<test-skin-i18n-first-text>Settings</test-skin-i18n-first-text>';

class TestSkinElement extends SkinElement {
  static override readonly template = skinTemplate;
}

class TestMissingKeyElement extends SkinElement {
  static override readonly template = missingKeyTemplate;
}

class TestChildTextElement extends SkinElement {
  static override readonly template = childTextTemplate;
}

class TestFirstUpdateElement extends SkinElement {
  static override readonly template = firstUpdateTemplate;
}

class TestFirstTextElement extends MediaTextElement {
  firstText: string | undefined;

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.firstText ??= this.textContent ?? '';
  }
}

class TestI18nProviderElement extends ReactiveElement {
  readonly provider = new ContextProvider(this, {
    context: i18nContext,
    initialValue: {
      translator: ((key: string) => (key === 'Settings' ? 'Ancestor settings' : key)) as Translator,
      locale: 'xx' as Locale,
    },
  });
}

if (!customElements.get('test-skin-i18n')) {
  customElements.define('test-skin-i18n', TestSkinElement);
}

if (!customElements.get('test-skin-i18n-missing-key')) {
  customElements.define('test-skin-i18n-missing-key', TestMissingKeyElement);
}

if (!customElements.get('test-skin-i18n-child-text')) {
  customElements.define('test-skin-i18n-child-text', TestChildTextElement);
}

if (!customElements.get('test-skin-i18n-first-update')) {
  customElements.define('test-skin-i18n-first-update', TestFirstUpdateElement);
}

if (!customElements.get('test-skin-i18n-first-text')) {
  customElements.define('test-skin-i18n-first-text', TestFirstTextElement);
}

if (!customElements.get('test-skin-i18n-provider')) {
  customElements.define('test-skin-i18n-provider', TestI18nProviderElement);
}

if (!customElements.get(MediaI18nProviderElement.tagName)) {
  customElements.define(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
}

if (!customElements.get(MediaTextElement.tagName)) {
  customElements.define(MediaTextElement.tagName, MediaTextElement);
}

describe('provider', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    resetI18nRegistry();
  });

  it('uses an ancestor translator for shadow labels', async () => {
    registerI18n('xx', { Settings: 'Skin settings' });
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
    expect(text.textContent).toBe('Ancestor settings');
  });

  it('uses English fallback for shadow labels without a provider', async () => {
    registerI18n('xx', { Settings: 'Skin settings' });
    const skin = document.createElement('test-skin-i18n') as TestSkinElement;
    skin.lang = 'xx';
    document.body.append(skin);

    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    expect(text.textContent).toBe('Settings');
  });

  it('falls back to the key when a shadow label is missing', async () => {
    const skin = document.createElement('test-skin-i18n-missing-key') as TestMissingKeyElement;
    document.body.append(skin);

    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    expect(text.textContent).toBe('missingLabel');
  });

  it('updates shadow labels when provider lang changes', async () => {
    registerI18n('xx', { Settings: 'Skin settings' });
    registerI18n('yy', { Settings: 'Other settings' });
    const provider = new MediaI18nProviderElement();
    const skin = document.createElement('test-skin-i18n') as TestSkinElement;
    provider.lang = 'xx';
    provider.append(skin);
    document.body.append(provider);

    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    expect(text.textContent).toBe('Skin settings');

    provider.lang = 'yy';

    await vi.waitFor(() => expect(text.textContent).toBe('Other settings'));
  });

  it('publishes provider lang before child text updates', async () => {
    registerI18n('xx', { Settings: 'Skin settings' });
    const provider = new MediaI18nProviderElement();
    const skin = document.createElement('test-skin-i18n-first-update') as TestFirstUpdateElement;
    provider.lang = 'xx';
    provider.append(skin);
    document.body.append(provider);

    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector('test-skin-i18n-first-text') as TestFirstTextElement;
    await text.updateComplete;

    expect(text.firstText).toBe('Skin settings');
    expect(text.textContent).toBe('Skin settings');
  });

  it('keeps child text when key is undefined', async () => {
    const skin = document.createElement('test-skin-i18n-child-text') as TestChildTextElement;
    document.body.append(skin);

    await skin.updateComplete;
    const text = skin.shadowRoot!.querySelector(MediaTextElement.tagName) as MediaTextElement;
    await text.updateComplete;

    expect(text.textContent).toBe('Fallback label');
  });
});
