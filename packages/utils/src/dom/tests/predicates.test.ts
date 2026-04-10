import { describe, expect, it } from 'vitest';

import { isEditableTarget, isHTMLAudioElement, isHTMLMediaElement, isHTMLVideoElement } from '../predicates';

function keydown(target: EventTarget, options?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, ...options });
  target.dispatchEvent(event);
  return event;
}

describe('DOM predicates', () => {
  describe('isHTMLVideoElement', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLVideoElement(video)).toBe(true);
    });

    it('returns false for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLVideoElement(audio)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLVideoElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLVideoElement(null)).toBe(false);
      expect(isHTMLVideoElement(undefined)).toBe(false);
      expect(isHTMLVideoElement('video')).toBe(false);
      expect(isHTMLVideoElement({})).toBe(false);
    });
  });

  describe('isHTMLAudioElement', () => {
    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLAudioElement(audio)).toBe(true);
    });

    it('returns false for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLAudioElement(video)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLAudioElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLAudioElement(null)).toBe(false);
      expect(isHTMLAudioElement(undefined)).toBe(false);
      expect(isHTMLAudioElement('audio')).toBe(false);
      expect(isHTMLAudioElement({})).toBe(false);
    });
  });

  describe('isHTMLMediaElement', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLMediaElement(video)).toBe(true);
    });

    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLMediaElement(audio)).toBe(true);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLMediaElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLMediaElement(null)).toBe(false);
      expect(isHTMLMediaElement(undefined)).toBe(false);
      expect(isHTMLMediaElement('video')).toBe(false);
      expect(isHTMLMediaElement({})).toBe(false);
    });
  });
});

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
