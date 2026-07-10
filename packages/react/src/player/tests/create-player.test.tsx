import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { PlayerStore } from '@videojs/core/dom';
import { defineSlice } from '@videojs/store';
import type { ReactNode } from 'react';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, useLocale } from '../../i18n';
import { useContainer, usePlayerContext } from '../context';
import { createPlayer } from '../create-player';

describe('createPlayer', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
  });

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
      vi.useFakeTimers();

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
      vi.runAllTimers();

      expect(destroySpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('recovers after Activity-style async destroy (React <Activity>)', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      let store!: PlayerStore;
      // Captured inside TestComponent so we can trigger a media-dep change
      // from the test body, simulating Activity reveal re-running the attach effect.
      let setMediaFn!: (media: HTMLMediaElement | null) => void;

      function TestComponent() {
        store = usePlayer();
        const { setMedia } = usePlayerContext();
        setMediaFn = setMedia;
        return null;
      }

      render(
        <Provider>
          <TestComponent />
        </Provider>
      );

      const originalStore = store;
      expect(originalStore.destroyed).toBe(false);

      // Simulate the Activity gap: the deferred timeout fires before React gets
      // a chance to re-run effects, leaving the store destroyed.
      originalStore.destroy();
      expect(originalStore.destroyed).toBe(true);

      // Mirrors the real app: Activity reveals the subtree with an already-attached media element.
      expect(() => {
        act(() => {
          setMediaFn(document.createElement('video'));
        });
      }).not.toThrow();

      expect(store).toBeDefined();
      expect(store.destroyed).toBe(false);
      expect(store).not.toBe(originalStore);
    });

    it('survives React StrictMode without StoreError', () => {
      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      let store!: PlayerStore;

      function TestComponent() {
        store = usePlayer();
        return null;
      }

      expect(() => {
        render(
          <StrictMode>
            <Provider>
              <TestComponent />
            </Provider>
          </StrictMode>
        );
      }).not.toThrow();

      expect(store).toBeDefined();
      expect(store.destroyed).toBe(false);
    });

    it('StrictMode: preserves the same store instance and cancels the pending destroy', () => {
      vi.useFakeTimers();

      const { Provider, usePlayer } = createPlayer({ features: [mockSlice] });

      // Track every store instance the component sees across all renders.
      const seenStores = new Set<PlayerStore>();
      let currentStore!: PlayerStore;

      function TestComponent() {
        currentStore = usePlayer();
        seenStores.add(currentStore);
        return null;
      }

      render(
        <StrictMode>
          <Provider>
            <TestComponent />
          </Provider>
        </StrictMode>
      );

      // Flush timers — the deferred destroy was scheduled during StrictMode's
      // simulated cleanup. If it was NOT cancelled by the re-mount effect, the
      // store would be destroyed here.
      vi.runAllTimers();

      // The Activity guard must not have fired: one store instance, not two.
      // (setStore would have been called and produced a second instance.)
      expect(seenStores.size).toBe(1);
      expect(currentStore.destroyed).toBe(false);

      vi.useRealTimers();
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

    it('does not derive a locale without an I18nProvider', async () => {
      document.documentElement.lang = 'de';
      const { Provider, Container } = createPlayer({ features: [mockSlice] });

      function Locale() {
        const container = useContainer();
        const locale = useLocale();
        return <span>{container ? locale : 'pending'}</span>;
      }

      render(
        <Provider>
          <Container>
            <Locale />
          </Container>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.queryByText('en')).not.toBeNull();
      });
    });

    it('inherits an explicit I18nProvider', async () => {
      const { Provider, Container } = createPlayer({ features: [mockSlice] });

      function Locale() {
        const container = useContainer();
        const locale = useLocale();
        return <span>{container ? locale : 'pending'}</span>;
      }

      render(
        <I18nProvider locale="de">
          <Provider>
            <Container>
              <Locale />
            </Container>
          </Provider>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('de')).not.toBeNull();
      });
    });

    it('provides a stable context value across parent re-renders (fix for #1296)', () => {
      const { Provider } = createPlayer({ features: [mockSlice] });

      const receivedValues: unknown[] = [];

      function ContextConsumer() {
        const ctx = usePlayerContext();
        receivedValues.push(ctx);
        return null;
      }

      let forceParentRerender!: () => void;
      function Parent() {
        const [, setTick] = useState(0);
        forceParentRerender = () => setTick((t) => t + 1);
        return (
          <Provider>
            <ContextConsumer />
          </Provider>
        );
      }

      render(<Parent />);

      const valueAfterMount = receivedValues[receivedValues.length - 1];

      act(() => forceParentRerender());
      act(() => forceParentRerender());
      act(() => forceParentRerender());

      const valueAfterRerenders = receivedValues[receivedValues.length - 1];

      expect(valueAfterRerenders).toBe(valueAfterMount);
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
