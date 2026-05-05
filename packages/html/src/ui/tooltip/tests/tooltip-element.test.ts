import type { ButtonState } from '@videojs/core';
import { HOTKEY_SHORTCUT_CHANGE_EVENT } from '@videojs/core/dom';
import { createState } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';
import { TooltipElement } from '../tooltip-element';
import { TooltipLabelElement } from '../tooltip-label-element';
import { TooltipShortcutElement } from '../tooltip-shortcut-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

class TestTriggerElement extends HTMLElement {
  $state = createState<ButtonState>({ label: 'Play' });
  shortcut: string | undefined = 'K';

  getLabel(): string | undefined {
    return this.$state.current.label;
  }

  getShortcut(): string | undefined {
    return this.shortcut;
  }
}

function defineTestElements(): void {
  if (!customElements.get('test-tooltip-trigger')) {
    customElements.define('test-tooltip-trigger', TestTriggerElement);
  }
  if (!customElements.get(TooltipLabelElement.tagName)) {
    customElements.define(TooltipLabelElement.tagName, TooltipLabelElement);
  }
  if (!customElements.get(TooltipShortcutElement.tagName)) {
    customElements.define(TooltipShortcutElement.tagName, TooltipShortcutElement);
  }
}

function setup() {
  defineTestElements();

  const trigger = document.createElement('test-tooltip-trigger') as TestTriggerElement;
  const tooltip = createElement(TooltipElement);

  tooltip.id = 'tooltip';
  trigger.setAttribute('commandfor', tooltip.id);
  document.body.append(trigger, tooltip);

  return { tooltip, trigger };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TooltipElement', () => {
  it('creates default label and shortcut elements for empty tooltips', async () => {
    const { tooltip } = setup();

    await tooltip.updateComplete;

    const label = TooltipLabelElement.findIn(tooltip);
    const shortcut = TooltipShortcutElement.findIn(tooltip);
    expect(label?.localName).toBe(TooltipLabelElement.tagName);
    expect(label?.textContent).toBe('Play');
    expect(shortcut?.localName).toBe(TooltipShortcutElement.tagName);
    expect(shortcut?.textContent).toBe('K');
    expect(shortcut?.hidden).toBe(false);
  });

  it('syncs label and shortcut onto existing compound parts', async () => {
    const { tooltip } = setup();
    const labelEl = TooltipLabelElement.create();
    const shortcutEl = TooltipShortcutElement.create();
    tooltip.replaceChildren(document.createTextNode('Action: '), labelEl, shortcutEl);

    await tooltip.updateComplete;

    const label = TooltipLabelElement.findIn(tooltip);
    expect(tooltip.textContent).toBe('Action: PlayK');
    expect(label?.textContent).toBe('Play');
    expect(TooltipShortcutElement.findIn(tooltip)?.textContent).toBe('K');
  });

  it('preserves authored content without tooltip parts', async () => {
    const { tooltip } = setup();
    tooltip.textContent = 'Custom tooltip';

    await tooltip.updateComplete;

    expect(tooltip.textContent).toBe('Custom tooltip');
  });

  it('updates shortcut text when the trigger shortcut changes', async () => {
    const { tooltip, trigger } = setup();

    await tooltip.updateComplete;

    trigger.shortcut = 'P';
    trigger.dispatchEvent(new CustomEvent(HOTKEY_SHORTCUT_CHANGE_EVENT));

    expect(TooltipShortcutElement.findIn(tooltip)?.textContent).toBe('P');
  });

  it('hides shortcut part when the trigger shortcut is cleared', async () => {
    const { tooltip, trigger } = setup();

    await tooltip.updateComplete;

    trigger.shortcut = undefined;
    trigger.dispatchEvent(new CustomEvent(HOTKEY_SHORTCUT_CHANGE_EVENT));

    const shortcut = TooltipShortcutElement.findIn(tooltip);
    expect(shortcut?.textContent).toBe('');
    expect(shortcut?.hidden).toBe(true);
  });
});
