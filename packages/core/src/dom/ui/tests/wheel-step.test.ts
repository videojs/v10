import { describe, expect, it, vi } from 'vitest';

import type { UIWheelEvent } from '../event';
import { createWheelStep, type WheelStepOptions } from '../wheel-step';

function wheelEvent(deltaY: number): UIWheelEvent {
  return {
    deltaY,
    preventDefault: vi.fn(),
  };
}

function createOptions(overrides: Partial<WheelStepOptions> = {}): WheelStepOptions {
  return {
    isDisabled: () => false,
    getPercent: () => 50,
    getStepPercent: () => 1,
    onValueChange: vi.fn(),
    ...overrides,
  };
}

describe('createWheelStep', () => {
  it('scroll up increments by step', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(
      createOptions({ getPercent: () => 50, getStepPercent: () => 1, onValueChange })
    );

    onWheel(wheelEvent(-1));

    expect(onValueChange).toHaveBeenCalledWith(51);
  });

  it('scroll down decrements by step', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(
      createOptions({ getPercent: () => 50, getStepPercent: () => 1, onValueChange })
    );

    onWheel(wheelEvent(1));

    expect(onValueChange).toHaveBeenCalledWith(49);
  });

  it('uses step percent from options', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(
      createOptions({ getPercent: () => 50, getStepPercent: () => 5, onValueChange })
    );

    onWheel(wheelEvent(-1));

    expect(onValueChange).toHaveBeenCalledWith(55);
  });

  it('clamps to 0 on scroll down at minimum', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(createOptions({ getPercent: () => 0, getStepPercent: () => 5, onValueChange }));

    onWheel(wheelEvent(1));

    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it('clamps to 100 on scroll up at maximum', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(
      createOptions({ getPercent: () => 100, getStepPercent: () => 5, onValueChange })
    );

    onWheel(wheelEvent(-1));

    expect(onValueChange).toHaveBeenCalledWith(100);
  });

  it('no-ops when disabled', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(createOptions({ isDisabled: () => true, onValueChange }));

    const event = wheelEvent(-1);
    onWheel(event);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('calls preventDefault on scroll', () => {
    const { onWheel } = createWheelStep(createOptions());

    const event = wheelEvent(-1);
    onWheel(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('ignores zero deltaY', () => {
    const onValueChange = vi.fn();
    const { onWheel } = createWheelStep(createOptions({ onValueChange }));

    const event = wheelEvent(0);
    onWheel(event);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
