import { flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDialog, type DialogOptions } from '../dialog';
import { createTransition } from '../transition';

const dialogs = new Set<ReturnType<typeof createDialog>>();

function createTestDialog(overrides?: Partial<DialogOptions>) {
  const onOpenChange = vi.fn();
  const dialog = createDialog({
    transition: createTransition(),
    onOpenChange,
    ...overrides,
  });
  dialogs.add(dialog);
  return { dialog, onOpenChange };
}

afterEach(() => {
  for (const dialog of dialogs) dialog.destroy();
  dialogs.clear();
  document.body.innerHTML = '';
});

describe('createDialog', () => {
  it('opens from its trigger', () => {
    const { dialog, onOpenChange } = createTestDialog();

    dialog.triggerProps.onClick(new MouseEvent('click'));

    expect(dialog.input.current).toEqual({ active: true, status: 'starting' });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('focuses the first tabbable element on open', async () => {
    const { dialog } = createTestDialog();
    const popup = document.createElement('div');
    popup.tabIndex = -1;
    const first = document.createElement('button');
    popup.append(first);
    document.body.append(popup);
    dialog.setPopupElement(popup);

    dialog.open();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(document.activeElement).toBe(first);
  });

  it('traps Tab focus within the popup', () => {
    const { dialog } = createTestDialog();
    const popup = document.createElement('div');
    popup.tabIndex = -1;
    const first = document.createElement('button');
    const last = document.createElement('button');
    popup.append(first, last);
    document.body.append(popup);
    dialog.setPopupElement(popup);
    dialog.open();
    flush();

    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.activeElement).toBe(first);
  });

  it('restores focus to the trigger after closing', async () => {
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    popup.tabIndex = -1;
    document.body.append(trigger, popup);

    const { dialog } = createTestDialog();
    dialog.setTriggerElement(trigger);
    dialog.setPopupElement(popup);
    trigger.focus();
    dialog.open();
    dialog.close();

    await vi.waitFor(() => expect(dialog.input.current.active).toBe(false));
    expect(document.activeElement).toBe(trigger);
  });

  it('makes content outside the popup inert while open', async () => {
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    document.body.append(trigger, popup);

    const { dialog } = createTestDialog();
    dialog.setTriggerElement(trigger);
    dialog.setPopupElement(popup);
    dialog.open();

    expect(trigger.hasAttribute('inert')).toBe(true);

    dialog.close();
    await vi.waitFor(() => expect(dialog.input.current.active).toBe(false));

    expect(trigger.hasAttribute('inert')).toBe(false);
  });

  it('only closes the topmost dialog on Escape', async () => {
    const first = createTestDialog();
    const second = createTestDialog();
    const firstPopup = document.createElement('div');
    const secondPopup = document.createElement('div');
    document.body.append(firstPopup, secondPopup);
    first.dialog.setPopupElement(firstPopup);
    second.dialog.setPopupElement(secondPopup);
    first.dialog.open();
    second.dialog.open();

    expect(firstPopup.hasAttribute('inert')).toBe(true);
    expect(secondPopup.hasAttribute('inert')).toBe(false);

    flush();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(first.dialog.input.current.active).toBe(true);
    expect(second.dialog.input.current.status).toBe('ending');

    await vi.waitFor(() => expect(second.dialog.input.current.active).toBe(false));
    expect(firstPopup.hasAttribute('inert')).toBe(false);
    expect(secondPopup.hasAttribute('inert')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(first.dialog.input.current.status).toBe('ending');
  });

  it('does not close when an arbitrary button inside the dialog is clicked', () => {
    const { dialog, onOpenChange } = createTestDialog();
    const popup = document.createElement('div');
    const playerControl = document.createElement('button');
    popup.append(playerControl);
    document.body.append(popup);
    dialog.setPopupElement(popup);
    dialog.open();
    onOpenChange.mockClear();

    playerControl.click();

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog.input.current.active).toBe(true);
  });
});
