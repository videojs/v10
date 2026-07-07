import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Value } from '../time-value';

vi.mock('@videojs/store/react', () => ({
  useStore: vi.fn((store: { state: object }, selector?: (state: object) => unknown) =>
    selector ? selector(store.state) : store
  ),
}));

const timeState = {
  currentTime: 90,
  duration: 300,
  seeking: false,
  seek: vi.fn(),
};

function setup(props: Value.Props = {}) {
  const { Wrapper } = createPlayerWrapper(timeState);

  return render(
    <Wrapper>
      <Value data-testid="time" {...props} />
    </Wrapper>
  );
}

afterEach(cleanup);

describe('Time.Value', () => {
  it('renders current time by default', () => {
    setup();

    const time = screen.getByTestId('time');
    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('toggles current time to remaining time on click', () => {
    setup({ toggle: true });

    const time = screen.getByTestId('time');
    fireEvent.click(time);

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
    expect(time.getAttribute('aria-label')).toBe('3 minutes, 30 seconds remaining. Show elapsed time.');

    fireEvent.click(time);

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
    expect(time.getAttribute('aria-label')).toBe('1 minute, 30 seconds. Show remaining time.');
  });

  it('toggles with Enter and Space', () => {
    setup({ toggle: true });

    const time = screen.getByTestId('time');
    fireEvent.keyDown(time, { key: 'Enter' });

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    fireEvent.keyDown(time, { key: ' ' });

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('does not toggle on repeated keydown events', () => {
    setup({ toggle: true });

    const time = screen.getByTestId('time');
    fireEvent.keyDown(time, { key: 'Enter' });
    fireEvent.keyDown(time, { key: 'Enter', repeat: true });

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('starts in remaining mode when type is remaining', () => {
    setup({ toggle: true, type: 'remaining' });

    const time = screen.getByTestId('time');
    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
    expect(time.getAttribute('aria-label')).toBe('3 minutes, 30 seconds remaining. Show duration.');
  });

  it('toggles remaining time to duration on click', () => {
    setup({ toggle: true, type: 'remaining' });

    const time = screen.getByTestId('time');
    fireEvent.click(time);

    expect(time.textContent).toBe('5:00');
    expect(time.getAttribute('data-type')).toBe('duration');
    expect(time.getAttribute('role')).toBe('button');

    fireEvent.click(time);

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('resets to the default type when toggle is turned off', () => {
    const { Wrapper } = createPlayerWrapper(timeState);
    const { rerender } = render(
      <Wrapper>
        <Value data-testid="time" toggle />
      </Wrapper>
    );

    const time = screen.getByTestId('time');
    fireEvent.click(time);

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    rerender(
      <Wrapper>
        <Value data-testid="time" />
      </Wrapper>
    );

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');

    rerender(
      <Wrapper>
        <Value data-testid="time" toggle />
      </Wrapper>
    );

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('toggles duration to remaining time on click', () => {
    setup({ toggle: true, type: 'duration' });

    const time = screen.getByTestId('time');
    fireEvent.click(time);

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    fireEvent.click(time);

    expect(time.textContent).toBe('5:00');
    expect(time.getAttribute('data-type')).toBe('duration');
  });

  it('calls user event handlers before toggling', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();

    setup({ toggle: true, onClick, onKeyDown });

    const time = screen.getByTestId('time');
    fireEvent.click(time);
    fireEvent.keyDown(time, { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('does not toggle when user event handlers prevent default', () => {
    setup({
      toggle: true,
      onClick: (event) => event.preventDefault(),
      onKeyDown: (event) => event.preventDefault(),
    });

    const time = screen.getByTestId('time');
    fireEvent.click(time);
    fireEvent.keyDown(time, { key: 'Enter' });

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });
});
