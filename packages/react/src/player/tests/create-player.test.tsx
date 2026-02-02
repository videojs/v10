import { render, renderHook } from '@testing-library/react';
import type { PlayerStore } from '@videojs/core/dom';
import { defineSlice } from '@videojs/store';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../create-player';

describe('createPlayer', () => {
  // Create a mock slice that works with any target
  const mockSlice = defineSlice()({
    state: () => ({
      volume: 1,
      muted: false,
      paused: true,
    }),
  });

  describe('Provider', () => {
    it('creates store on mount', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      let store!: PlayerStore;

      function TestComponent() {
        store = usePlayer();
        return null;
      }

      render(
        <Provider>
          <TestComponent />
        </Provider>
      );

      expect(store).toBeDefined();
      expect(typeof store.subscribe).toBe('function');
      expect(typeof store.attach).toBe('function');
      expect(typeof store.destroy).toBe('function');
    });

    it('destroys store on unmount', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      let store!: PlayerStore;

      function TestComponent() {
        store = usePlayer();
        return null;
      }

      const { unmount } = render(
        <Provider>
          <TestComponent />
        </Provider>
      );

      const destroySpy = vi.spyOn(store, 'destroy');
      unmount();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('uses displayName when provided', () => {
      const { Provider } = createPlayer({
        features: [mockSlice],
        displayName: 'VideoPlayer',
      });

      expect(Provider.displayName).toBe('VideoPlayer.Provider');
    });

    it('renders children', () => {
      const { Provider } = createPlayer({ features: [mockSlice] });

      const { container } = render(
        <Provider>
          <span data-testid="child">test</span>
        </Provider>
      );

      expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    });
  });

  describe('usePlayer', () => {
    it('returns store without selector', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(() => usePlayer(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.attach).toBe('function');
    });

    it('returns selected state with selector', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(() => usePlayer((state: any) => state.volume), { wrapper });

      expect(result.current).toBe(1);
    });

    it('throws outside Provider', () => {
      const { usePlayer } = createPlayer({ features: [mockSlice] });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePlayer());
      }).toThrow('usePlayerContext must be used within a Player Provider');

      consoleSpy.mockRestore();
    });
  });

  describe('Container', () => {
    it('is exported from createPlayer result', () => {
      const { Container } = createPlayer({ features: [mockSlice] });
      expect(Container).toBeDefined();
    });
  });

  describe('full integration', () => {
    it('Provider → Container → media attach flow', () => {
      const { Provider, Container, usePlayer } = createPlayer({ features: [mockSlice] });

      let store!: PlayerStore;

      function TestComponent() {
        store = usePlayer();
        return (
          <Container data-testid="container">
            <video data-testid="video">
              <track kind="captions" />
            </video>
          </Container>
        );
      }

      const { container } = render(
        <Provider>
          <TestComponent />
        </Provider>
      );

      // Store should exist
      expect(store).toBeDefined();

      // Container should render
      const containerEl = container.querySelector('[data-testid="container"]');
      expect(containerEl).toBeTruthy();

      // Video should render inside container
      const videoEl = container.querySelector('[data-testid="video"]');
      expect(videoEl).toBeTruthy();
    });
  });
});
