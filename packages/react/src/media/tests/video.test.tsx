import { render } from '@testing-library/react';

import { createFeature } from '@videojs/store';
import { createStore } from '@videojs/store/react';
import { describe, expect, it, vi } from 'vitest';

import { Video } from '../video';

describe('video', () => {
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
  }

  const mockFeature = createFeature<MockMedia>()({
    initialState: { volume: 1, muted: false },
    getSnapshot: ({ target }) => ({
      volume: target.volume,
      muted: target.muted,
    }),
    subscribe: () => {},
    request: {},
  });

  function createTestStore() {
    return createStore({ features: [mockFeature] });
  }

  it('renders a video element', () => {
    const { Provider } = createTestStore();

    const { container } = render(
      <Provider>
        <Video data-testid="test-video" />
      </Provider>
    );

    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.getAttribute('data-testid')).toBe('test-video');
  });

  it('passes props to video element', () => {
    const { Provider } = createTestStore();

    const { container } = render(
      <Provider>
        <Video src="test.mp4" controls autoPlay playsInline />
      </Provider>
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video?.getAttribute('src')).toBe('test.mp4');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(true);
    // playsInline becomes playsinline attribute
    expect(video?.hasAttribute('playsinline')).toBe(true);
  });

  it('renders children', () => {
    const { Provider } = createTestStore();

    const { container } = render(
      <Provider>
        <Video>
          <source src="test.mp4" type="video/mp4" />
          <track kind="captions" src="captions.vtt" />
        </Video>
      </Provider>
    );

    const video = container.querySelector('video');
    expect(video?.querySelector('source')).toBeTruthy();
    expect(video?.querySelector('track')).toBeTruthy();
  });

  it('attaches video to store on mount', () => {
    const { Provider, useStore } = createTestStore();

    let attachCalled = false;

    function TestComponent() {
      const store = useStore();

      // Spy on attach
      const originalAttach = store.attach.bind(store);

      store.attach = (target) => {
        attachCalled = true;
        return originalAttach(target);
      };

      return <Video />;
    }

    render(
      <Provider>
        <TestComponent />
      </Provider>
    );

    expect(attachCalled).toBe(true);
  });

  it('works with external ref', () => {
    const { Provider } = createTestStore();
    let capturedElement: HTMLVideoElement | null = null;

    function TestComponent() {
      return (
        <Video
          ref={(el) => {
            capturedElement = el;
          }}
        />
      );
    }

    render(
      <Provider>
        <TestComponent />
      </Provider>
    );

    expect(capturedElement).toBeInstanceOf(HTMLVideoElement);
  });

  it('throws when used outside Provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Video />);
    }).toThrow('useStoreContext must be used within a Provider');

    consoleSpy.mockRestore();
  });
});
