import { flush } from '@videojs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UIKeyboardEvent, UIPointerEvent } from '../event';
import { createSlider, type SliderApi, type SliderOptions } from '../slider';

// --- Helpers ---

function createMockElement(rect: Partial<DOMRect> = {}): HTMLElement {
  const el = document.createElement('div');

  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 200,
    height: 20,
    top: 0,
    right: 200,
    bottom: 20,
    left: 0,
    toJSON() {},
    ...rect,
  });

  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();

  return el;
}

function createOptions(overrides: Partial<SliderOptions> = {}): SliderOptions {
  return {
    getElement: () => createMockElement(),
    getOrientation: () => 'horizontal',
    isRTL: () => false,
    isDisabled: () => false,
    getPercent: () => 50,
    getStepPercent: () => 1,
    getLargeStepPercent: () => 10,
    onValueChange: vi.fn(),
    onValueCommit: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    ...overrides,
  };
}

function pointerEvent(overrides: Partial<UIPointerEvent> = {}): UIPointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 1,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function keyboardEvent(key: string, overrides: Partial<UIKeyboardEvent> = {}): UIKeyboardEvent {
  const node = document.createElement('div');

  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: node,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

/** Simulate a pointermove on the element (routed via pointer capture during drag). */
function firePointerMove(slider: SliderApi, overrides: Partial<UIPointerEvent> = {}): void {
  slider.rootProps.onPointerMove(pointerEvent(overrides));
}

/** Simulate a pointerup on the element (routed via pointer capture). */
function firePointerUp(slider: SliderApi, overrides: Partial<UIPointerEvent> = {}): void {
  slider.rootProps.onPointerUp(pointerEvent({ buttons: 0, ...overrides }));
}

/** Simulate lostpointercapture — fires after pointerup or pointercancel. */
function fireLostPointerCapture(slider: SliderApi): void {
  slider.rootProps.onLostPointerCapture();
}

// --- Tests ---

describe('createSlider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('shape', () => {
    it('returns state, rootProps, thumbProps, and destroy', () => {
      const slider = createSlider(createOptions());

      expect(slider.input).toBeDefined();
      expect(slider.input.current).toBeDefined();
      expect(slider.input.subscribe).toBeTypeOf('function');
      expect(slider.rootProps.onPointerDown).toBeTypeOf('function');
      expect(slider.rootProps.onPointerMove).toBeTypeOf('function');
      expect(slider.rootProps.onPointerLeave).toBeTypeOf('function');
      expect(slider.thumbProps.onKeyDown).toBeTypeOf('function');
      expect(slider.thumbProps.onFocus).toBeTypeOf('function');
      expect(slider.thumbProps.onBlur).toBeTypeOf('function');
      expect(slider.destroy).toBeTypeOf('function');

      slider.destroy();
    });

    it('has correct initial state', () => {
      const slider = createSlider(createOptions());

      expect(slider.input.current).toEqual({
        pointerPercent: 0,
        dragPercent: 0,
        dragging: false,
        pointing: false,
        focused: false,
      });

      slider.destroy();
    });
  });

  describe('pointer: pointerdown', () => {
    it('sets pointing to true and computes percent from position', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 100 }));
      flush();

      expect(slider.input.current.pointing).toBe(true);
      expect(slider.input.current.pointerPercent).toBe(50);

      slider.destroy();
    });

    it('calls onValueChange with computed percent', () => {
      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 100 }));

      expect(onValueChange).toHaveBeenCalledWith(50);

      slider.destroy();
    });

    it('sets pointer capture on element', () => {
      const el = createMockElement();
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ pointerId: 42 }));

      expect(el.setPointerCapture).toHaveBeenCalledWith(42);

      slider.destroy();
    });

    it('focuses thumb element when getThumbElement is provided', () => {
      const thumb = document.createElement('div');
      thumb.focus = vi.fn();

      const slider = createSlider(createOptions({ getThumbElement: () => thumb }));

      slider.rootProps.onPointerDown(pointerEvent());

      expect(thumb.focus).toHaveBeenCalled();

      slider.destroy();
    });

    it('calls preventDefault to suppress default focus behavior', () => {
      const slider = createSlider(createOptions());

      const event = pointerEvent();
      slider.rootProps.onPointerDown(event);

      expect(event.preventDefault).toHaveBeenCalled();

      slider.destroy();
    });

    it('does not call preventDefault when disabled', () => {
      const slider = createSlider(createOptions({ isDisabled: () => true }));

      const event = pointerEvent();
      slider.rootProps.onPointerDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('does nothing when disabled', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ isDisabled: () => true, onValueChange }));

      slider.rootProps.onPointerDown(pointerEvent());
      flush();

      expect(onValueChange).not.toHaveBeenCalled();
      expect(slider.input.current.pointing).toBe(false);

      slider.destroy();
    });
  });

  describe('pointer: drag', () => {
    it('starts drag after threshold pointermove events', () => {
      const onDragStart = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onDragStart }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));

      // First move — below threshold
      firePointerMove(slider, { clientX: 60 });
      flush();
      expect(slider.input.current.dragging).toBe(false);
      expect(onDragStart).not.toHaveBeenCalled();

      // Second move — meets threshold
      firePointerMove(slider, { clientX: 80 });
      flush();
      expect(slider.input.current.dragging).toBe(true);
      expect(onDragStart).toHaveBeenCalledOnce();

      slider.destroy();
    });

    it('calls onValueChange only after drag threshold is reached', () => {
      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Move 1: below threshold — no onValueChange
      firePointerMove(slider, { clientX: 60 });
      expect(onValueChange).not.toHaveBeenCalled();

      // Move 2: meets threshold — onValueChange fires
      firePointerMove(slider, { clientX: 80 });
      expect(onValueChange).toHaveBeenCalledTimes(1);

      // Move 3: during drag — onValueChange fires
      firePointerMove(slider, { clientX: 100 });
      expect(onValueChange).toHaveBeenCalledTimes(2);

      slider.destroy();
    });

    it('updates dragPercent during drag', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 100 });
      flush();

      expect(slider.input.current.dragPercent).toBe(50);

      slider.destroy();
    });
  });

  describe('pointer: pointerup', () => {
    it('calls onValueCommit on pointerup and onDragEnd on lostpointercapture', () => {
      const onValueCommit = vi.fn();
      const onDragEnd = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit, onDragEnd }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });

      // pointerup commits the value.
      firePointerUp(slider, { clientX: 100 });
      expect(onValueCommit).toHaveBeenCalledWith(50);

      // lostpointercapture cleans up drag state.
      fireLostPointerCapture(slider);
      flush();

      expect(onDragEnd).toHaveBeenCalled();
      expect(slider.input.current.dragging).toBe(false);
      expect(slider.input.current.pointing).toBe(false);

      slider.destroy();
    });

    it('calls onValueCommit on pointerup even without drag', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 100 }));
      firePointerUp(slider, { clientX: 100 });

      expect(onValueCommit).toHaveBeenCalledWith(50);

      slider.destroy();
    });
  });

  describe('pointer: lostpointercapture', () => {
    it('ends drag on lostpointercapture (e.g., after pointercancel)', () => {
      const onDragEnd = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onDragEnd }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });

      // Browser fires lostpointercapture after pointercancel or other capture loss.
      fireLostPointerCapture(slider);
      flush();

      expect(onDragEnd).toHaveBeenCalled();
      expect(slider.input.current.dragging).toBe(false);

      slider.destroy();
    });

    it('resets pointing state when no drag occurred', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      flush();
      expect(slider.input.current.pointing).toBe(true);

      // Lost capture without crossing drag threshold.
      fireLostPointerCapture(slider);
      flush();

      expect(slider.input.current.pointing).toBe(false);
      expect(slider.input.current.pointerPercent).toBe(25);

      slider.destroy();
    });
  });

  describe('pointer: stale drag safety', () => {
    it('ends drag when buttons is 0 for non-touch pointer', () => {
      const onDragEnd = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onDragEnd }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      flush();
      expect(slider.input.current.dragging).toBe(true);

      // Stale: buttons = 0, mouse pointer
      firePointerMove(slider, { clientX: 100, buttons: 0, pointerType: 'mouse' });
      flush();

      expect(slider.input.current.dragging).toBe(false);
      expect(onDragEnd).toHaveBeenCalled();

      slider.destroy();
    });

    it('does not end drag for touch pointer with buttons 0', () => {
      const onDragEnd = vi.fn();
      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onDragEnd, onValueChange }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      flush();
      expect(slider.input.current.dragging).toBe(true);

      // Touch with buttons=0 should NOT trigger stale drag detection
      firePointerMove(slider, { clientX: 100, buttons: 0, pointerType: 'touch' });
      flush();

      expect(slider.input.current.dragging).toBe(true);
      expect(onDragEnd).not.toHaveBeenCalled();

      slider.destroy();
    });
  });

  describe('pointer: hover (no drag)', () => {
    it('updates pointerPercent on hover', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerMove(pointerEvent({ clientX: 60 }));
      flush();

      expect(slider.input.current.pointing).toBe(true);
      expect(slider.input.current.pointerPercent).toBe(30);

      slider.destroy();
    });

    it('clears pointing on pointerleave and keeps last pointerPercent', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerMove(pointerEvent({ clientX: 60 }));
      slider.rootProps.onPointerLeave(pointerEvent());
      flush();

      expect(slider.input.current.pointing).toBe(false);
      expect(slider.input.current.pointerPercent).toBe(30);

      slider.destroy();
    });

    it('does not reset on pointerleave while pointer is captured', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      flush();
      expect(slider.input.current.dragging).toBe(true);

      // pointerleave is suppressed during capture; if it fires, it should be ignored.
      slider.rootProps.onPointerLeave(pointerEvent());
      flush();

      expect(slider.input.current.pointing).toBe(true);

      slider.destroy();
    });
  });

  describe('keyboard', () => {
    it('ArrowRight increments by step', () => {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      const slider = createSlider(
        createOptions({
          getPercent: () => 50,
          getStepPercent: () => 1,
          onValueChange,
          onValueCommit,
        })
      );

      const event = keyboardEvent('ArrowRight');
      slider.thumbProps.onKeyDown(event);

      expect(onValueChange).toHaveBeenCalledWith(51);
      expect(onValueCommit).toHaveBeenCalledWith(51);
      expect(event.preventDefault).toHaveBeenCalled();

      slider.destroy();
    });

    it('ArrowLeft decrements by step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 50, getStepPercent: () => 1, onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowLeft'));

      expect(onValueChange).toHaveBeenCalledWith(49);

      slider.destroy();
    });

    it('ArrowUp increments by step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 50, getStepPercent: () => 5, onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowUp'));

      expect(onValueChange).toHaveBeenCalledWith(55);

      slider.destroy();
    });

    it('ArrowDown decrements by step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 50, getStepPercent: () => 5, onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowDown'));

      expect(onValueChange).toHaveBeenCalledWith(45);

      slider.destroy();
    });

    it('Shift+Arrow uses large step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({
          getPercent: () => 50,
          getStepPercent: () => 1,
          getLargeStepPercent: () => 10,
          onValueChange,
        })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight', { shiftKey: true }));

      expect(onValueChange).toHaveBeenCalledWith(60);

      slider.destroy();
    });

    it('PageUp increments by large step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({ getPercent: () => 50, getLargeStepPercent: () => 10, onValueChange })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('PageUp'));

      expect(onValueChange).toHaveBeenCalledWith(60);

      slider.destroy();
    });

    it('PageDown decrements by large step', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({ getPercent: () => 50, getLargeStepPercent: () => 10, onValueChange })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('PageDown'));

      expect(onValueChange).toHaveBeenCalledWith(40);

      slider.destroy();
    });

    it('Home goes to 0%', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('Home'));

      expect(onValueChange).toHaveBeenCalledWith(0);

      slider.destroy();
    });

    it('End goes to 100%', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('End'));

      expect(onValueChange).toHaveBeenCalledWith(100);

      slider.destroy();
    });

    it('numeric keys jump to N * 10%', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('5'));
      expect(onValueChange).toHaveBeenCalledWith(50);

      onValueChange.mockClear();
      slider.thumbProps.onKeyDown(keyboardEvent('0'));
      expect(onValueChange).toHaveBeenCalledWith(0);

      onValueChange.mockClear();
      slider.thumbProps.onKeyDown(keyboardEvent('9'));
      expect(onValueChange).toHaveBeenCalledWith(90);

      slider.destroy();
    });

    it('numeric keys do not fire when metaKey is held', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('5', { metaKey: true }));

      expect(onValueChange).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('numeric keys do not fire when ctrlKey is held', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('5', { ctrlKey: true }));

      expect(onValueChange).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('numeric keys do not fire when altKey is held', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('5', { altKey: true }));

      expect(onValueChange).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('clamps to 0-100 range', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 99, getStepPercent: () => 5, onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight'));

      expect(onValueChange).toHaveBeenCalledWith(100);

      slider.destroy();
    });

    it('calls both onValueChange and onValueCommit for each step', () => {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 50, onValueChange, onValueCommit }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight'));

      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onValueCommit).toHaveBeenCalledOnce();

      slider.destroy();
    });

    it('preventDefault is called for handled keys', () => {
      const slider = createSlider(createOptions());

      const event = keyboardEvent('ArrowRight');
      slider.thumbProps.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();

      slider.destroy();
    });

    it('does not preventDefault for unhandled keys', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ onValueChange }));

      const event = keyboardEvent('Tab');
      slider.thumbProps.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(onValueChange).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('rounds before stepping to prevent drift', () => {
      const onValueChange = vi.fn();
      // Simulate a value between steps (e.g., from a drag that landed at 47.3)
      const slider = createSlider(createOptions({ getPercent: () => 47.3, getStepPercent: () => 5, onValueChange }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight'));

      // 47.3 rounds to 45 (nearest step of 5 from 0), then +5 = 50
      expect(onValueChange).toHaveBeenCalledWith(50);

      slider.destroy();
    });
  });

  describe('keyboard: RTL', () => {
    it('flips ArrowRight to decrement in RTL', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({
          isRTL: () => true,
          getPercent: () => 50,
          getStepPercent: () => 1,
          onValueChange,
        })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight'));

      expect(onValueChange).toHaveBeenCalledWith(49);

      slider.destroy();
    });

    it('flips ArrowLeft to increment in RTL', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({
          isRTL: () => true,
          getPercent: () => 50,
          getStepPercent: () => 1,
          onValueChange,
        })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowLeft'));

      expect(onValueChange).toHaveBeenCalledWith(51);

      slider.destroy();
    });

    it('does not flip ArrowUp/ArrowDown in RTL', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(
        createOptions({
          isRTL: () => true,
          getPercent: () => 50,
          getStepPercent: () => 1,
          onValueChange,
        })
      );

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowUp'));
      expect(onValueChange).toHaveBeenCalledWith(51);

      onValueChange.mockClear();
      slider.thumbProps.onKeyDown(keyboardEvent('ArrowDown'));
      expect(onValueChange).toHaveBeenCalledWith(49);

      slider.destroy();
    });
  });

  describe('keyboard: disabled', () => {
    it('no-ops when disabled (except Tab)', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ isDisabled: () => true, onValueChange }));

      const arrowEvent = keyboardEvent('ArrowRight');
      slider.thumbProps.onKeyDown(arrowEvent);

      expect(onValueChange).not.toHaveBeenCalled();
      expect(arrowEvent.preventDefault).toHaveBeenCalled();

      slider.destroy();
    });

    it('does not preventDefault Tab when disabled', () => {
      const slider = createSlider(createOptions({ isDisabled: () => true }));

      const tabEvent = keyboardEvent('Tab');
      slider.thumbProps.onKeyDown(tabEvent);

      expect(tabEvent.preventDefault).not.toHaveBeenCalled();

      slider.destroy();
    });
  });

  describe('focus', () => {
    it('sets focused true on focus', () => {
      const slider = createSlider(createOptions());

      slider.thumbProps.onFocus();
      flush();

      expect(slider.input.current.focused).toBe(true);

      slider.destroy();
    });

    it('sets focused false on blur', () => {
      const slider = createSlider(createOptions());

      slider.thumbProps.onFocus();
      slider.thumbProps.onBlur();
      flush();

      expect(slider.input.current.focused).toBe(false);

      slider.destroy();
    });
  });

  describe('orientation', () => {
    it('computes percent from Y axis for vertical orientation', () => {
      const el = createMockElement({ top: 0, height: 100 });
      const slider = createSlider(createOptions({ getElement: () => el, getOrientation: () => 'vertical' }));

      // vertical: 0% at bottom (y=100), 100% at top (y=0)
      slider.rootProps.onPointerDown(pointerEvent({ clientY: 25 }));
      flush();

      expect(slider.input.current.pointerPercent).toBe(75);

      slider.destroy();
    });

    it('computes percent from X axis for horizontal orientation', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, getOrientation: () => 'horizontal' }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      flush();

      expect(slider.input.current.pointerPercent).toBe(25);

      slider.destroy();
    });
  });

  describe('orientation: vertical + RTL', () => {
    it('ignores RTL for vertical orientation', () => {
      const el = createMockElement({ top: 0, height: 100 });
      const slider = createSlider(
        createOptions({ getElement: () => el, getOrientation: () => 'vertical', isRTL: () => true })
      );

      slider.rootProps.onPointerDown(pointerEvent({ clientY: 25 }));
      flush();

      // Same result as vertical + LTR — RTL has no effect.
      expect(slider.input.current.pointerPercent).toBe(75);

      slider.destroy();
    });
  });

  describe('RTL pointer', () => {
    it('flips horizontal percent for RTL', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, isRTL: () => true }));

      // RTL: right = 0%, left = 100%
      // clientX=50, rect.right=200 → (200-50)/200 = 75%
      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      flush();

      expect(slider.input.current.pointerPercent).toBe(75);

      slider.destroy();
    });
  });

  describe('lifecycle', () => {
    it('destroy cleans up without errors', () => {
      const slider = createSlider(createOptions());

      slider.destroy();

      // Should not throw on repeated destroy
      expect(() => slider.destroy()).not.toThrow();
    });

    it('releases pointer capture on destroy', () => {
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el }));

      slider.rootProps.onPointerDown(pointerEvent({ pointerId: 42, clientX: 50 }));
      slider.destroy();

      expect(el.releasePointerCapture).toHaveBeenCalledWith(42);
    });
  });

  describe('commit semantics', () => {
    it('does not fire onValueCommit during drag', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueCommit.mockClear();

      // Pass drag threshold and continue dragging
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      firePointerMove(slider, { clientX: 100 });

      // Commit must not fire during drag — only on release.
      expect(onValueCommit).not.toHaveBeenCalled();

      slider.destroy();
    });

    it('fires onValueChange on pointerup before onValueCommit', () => {
      const order: string[] = [];
      const onValueChange = vi.fn(() => order.push('change'));
      const onValueCommit = vi.fn(() => order.push('commit'));
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });

      onValueChange.mockClear();
      onValueCommit.mockClear();
      order.length = 0;

      firePointerUp(slider, { clientX: 100 });

      expect(onValueChange).toHaveBeenCalledWith(50);
      expect(onValueCommit).toHaveBeenCalledWith(50);
      expect(order).toEqual(['change', 'commit']);

      slider.destroy();
    });

    it('fires onValueCommit on stale drag exit with last drag percent', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      onValueCommit.mockClear();

      // Stale drag: buttons = 0, mouse pointer
      firePointerMove(slider, { clientX: 100, buttons: 0, pointerType: 'mouse' });

      expect(onValueCommit).toHaveBeenCalledOnce();
      // Last drag percent was 40% (80/200) — the stale move doesn't update it.
      expect(onValueCommit).toHaveBeenCalledWith(40);

      slider.destroy();
    });

    it('fires onValueCommit on lostpointercapture without pointerup', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      onValueCommit.mockClear();

      // Lost capture without pointerup (e.g., tab switch, pointercancel).
      fireLostPointerCapture(slider);

      expect(onValueCommit).toHaveBeenCalledOnce();
      expect(onValueCommit).toHaveBeenCalledWith(40);

      slider.destroy();
    });

    it('does not double-commit on pointerup followed by lostpointercapture', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      onValueCommit.mockClear();

      // Normal flow: pointerup commits, then lostpointercapture cleans up.
      firePointerUp(slider, { clientX: 100 });
      fireLostPointerCapture(slider);

      // Only one commit from pointerup.
      expect(onValueCommit).toHaveBeenCalledOnce();
      expect(onValueCommit).toHaveBeenCalledWith(50);

      slider.destroy();
    });

    it('does not fire onValueCommit on lostpointercapture without drag', () => {
      const onValueCommit = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueCommit }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueCommit.mockClear();

      // Lost capture before drag threshold was reached.
      fireLostPointerCapture(slider);

      expect(onValueCommit).not.toHaveBeenCalled();

      slider.destroy();
    });
  });

  describe('changeThrottle', () => {
    it('fires onValueChange immediately on first drag move (leading edge)', () => {
      vi.useFakeTimers();

      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, changeThrottle: 100 }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Pass drag threshold — first drag move fires immediately (leading edge).
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });

      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onValueChange).toHaveBeenCalledWith(40);

      slider.destroy();
      vi.useRealTimers();
    });

    it('coalesces rapid moves during cooldown to trailing edge', () => {
      vi.useFakeTimers();

      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, changeThrottle: 100 }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Pass threshold — leading fires.
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      expect(onValueChange).toHaveBeenCalledOnce();

      // More moves during cooldown.
      firePointerMove(slider, { clientX: 100 });
      firePointerMove(slider, { clientX: 120 });
      firePointerMove(slider, { clientX: 140 });

      // Still only the leading call.
      expect(onValueChange).toHaveBeenCalledOnce();

      // Trailing fires on cooldown expiry with latest value (140/200 = 70%).
      vi.advanceTimersByTime(100);
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(70);

      slider.destroy();
      vi.useRealTimers();
    });

    it('does not throttle onValueChange when changeThrottle is 0', () => {
      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, changeThrottle: 0 }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Every drag move fires immediately.
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      firePointerMove(slider, { clientX: 100 });

      expect(onValueChange).toHaveBeenCalledTimes(2);

      slider.destroy();
    });

    it('cancels throttled change and fires unthrottled on pointerup', () => {
      vi.useFakeTimers();

      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, changeThrottle: 100 }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Pass threshold (leading fires) and more moves.
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      firePointerMove(slider, { clientX: 120 });

      // Release before trailing fires.
      firePointerUp(slider, { clientX: 150 });

      // Leading (threshold) + unthrottled pointerup. The coalesced moves were cancelled.
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(75);

      // Advancing timer should NOT fire a stale trailing change.
      vi.advanceTimersByTime(200);
      expect(onValueChange).toHaveBeenCalledTimes(2);

      slider.destroy();
      vi.useRealTimers();
    });

    it('cancels throttle on destroy', () => {
      vi.useFakeTimers();

      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange, changeThrottle: 100 }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Pass threshold (leading fires).
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      // More moves pending.
      firePointerMove(slider, { clientX: 120 });

      slider.destroy();

      // Advancing timer should NOT fire the pending trailing change.
      vi.advanceTimersByTime(200);
      expect(onValueChange).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });

    it('does not throttle keyboard changes', () => {
      const onValueChange = vi.fn();
      const slider = createSlider(createOptions({ getPercent: () => 50, onValueChange, changeThrottle: 100 }));

      slider.thumbProps.onKeyDown(keyboardEvent('ArrowRight'));

      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onValueChange).toHaveBeenCalledWith(51);

      slider.destroy();
    });

    it('defaults changeThrottle to 0 when not provided', () => {
      const onValueChange = vi.fn();
      const el = createMockElement({ left: 0, width: 200 });
      const slider = createSlider(createOptions({ getElement: () => el, onValueChange }));

      slider.rootProps.onPointerDown(pointerEvent({ clientX: 50 }));
      onValueChange.mockClear();

      // Every drag move fires immediately (no throttle).
      firePointerMove(slider, { clientX: 60 });
      firePointerMove(slider, { clientX: 80 });
      firePointerMove(slider, { clientX: 100 });

      expect(onValueChange).toHaveBeenCalledTimes(2);

      slider.destroy();
    });
  });
});
