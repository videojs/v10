import { describe, expect, it } from 'vitest';

import { isEditableTarget, isInteractiveActivation } from '../interactive';

function keydown(target: EventTarget, options?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, ...options });
  target.dispatchEvent(event);
  return event;
}

describe('isEditableTarget', () => {
  it('returns true for text input', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const event = keydown(input);
    expect(isEditableTarget(event)).toBe(true);

    input.remove();
  });

  it('returns true for textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = keydown(textarea);
    expect(isEditableTarget(event)).toBe(true);

    textarea.remove();
  });

  it('returns true for select', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);

    const event = keydown(select);
    expect(isEditableTarget(event)).toBe(true);

    select.remove();
  });

  it('returns true for contenteditable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);

    const event = keydown(div);
    expect(isEditableTarget(event)).toBe(true);

    div.remove();
  });

  it('returns false for button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = keydown(button);
    expect(isEditableTarget(event)).toBe(false);

    button.remove();
  });

  it('returns false for range input', () => {
    const input = document.createElement('input');
    input.type = 'range';
    document.body.appendChild(input);

    const event = keydown(input);
    expect(isEditableTarget(event)).toBe(false);

    input.remove();
  });

  it('returns false for plain div', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = keydown(div);
    expect(isEditableTarget(event)).toBe(false);

    div.remove();
  });

  it('returns true for email input', () => {
    const input = document.createElement('input');
    input.type = 'email';
    document.body.appendChild(input);

    const event = keydown(input);
    expect(isEditableTarget(event)).toBe(true);

    input.remove();
  });

  it('returns true for search input', () => {
    const input = document.createElement('input');
    input.type = 'search';
    document.body.appendChild(input);

    const event = keydown(input);
    expect(isEditableTarget(event)).toBe(true);

    input.remove();
  });

  it('returns false for checkbox input', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    document.body.appendChild(input);

    const event = keydown(input);
    expect(isEditableTarget(event)).toBe(false);

    input.remove();
  });
});

describe('isInteractiveActivation', () => {
  it('returns true for Space on a button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = keydown(button, { key: ' ' });
    expect(isInteractiveActivation(event)).toBe(true);

    button.remove();
  });

  it('returns true for Enter on a button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = keydown(button, { key: 'Enter' });
    expect(isInteractiveActivation(event)).toBe(true);

    button.remove();
  });

  it('returns false for non-activation key on a button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = keydown(button, { key: 'a' });
    expect(isInteractiveActivation(event)).toBe(false);

    button.remove();
  });

  it('returns false for Space on a non-interactive element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = keydown(div, { key: ' ' });
    expect(isInteractiveActivation(event)).toBe(false);

    div.remove();
  });

  it('returns true for Space on element with role="slider"', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'slider');
    document.body.appendChild(div);

    const event = keydown(div, { key: ' ' });
    expect(isInteractiveActivation(event)).toBe(true);

    div.remove();
  });
});
