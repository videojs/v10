/**
 * F1 Playlist Resolution Spike
 *
 * Demonstrates dual-state orchestration using the unified state container
 * for both immutable state values and mutable platform objects.
 */

import { createState } from '../../packages/spf/src/core/state/create-state';

// =============================================================================
// State Definitions
// =============================================================================

/**
 * Immutable presentation state
 */
interface PresentationState {
  url: string | undefined;
  data: Presentation | undefined;
  error: Error | undefined;
}

/**
 * Mutable platform objects
 */
interface PlatformObjects {
  mediaElement: HTMLMediaElement | undefined;
  mediaSource: MediaSource | undefined;
}

/**
 * Parsed multivariant playlist
 */
interface Presentation {
  type: 'multivariant';
  variants: Array<{
    uri: string;
    bandwidth: number;
    codecs?: string;
  }>;
}

// =============================================================================
// Type Guards
// =============================================================================

function isUnresolved(state: PresentationState): state is { url: string; data: undefined; error: undefined } {
  return state.url !== undefined && state.data === undefined && state.error === undefined;
}

function isResolved(state: PresentationState): state is { url: string; data: Presentation } {
  return state.data !== undefined;
}

// =============================================================================
// Resolution Logic (Stub)
// =============================================================================

async function fetchPresentation(url: string, signal: AbortSignal): Promise<Presentation> {
  const response = await fetch(url, { signal });
  const text = await response.text();

  // Stub: In real implementation, would call parseMultivariantPlaylist()
  return {
    type: 'multivariant',
    variants: [
      { uri: `${url}/variant1.m3u8`, bandwidth: 1000000, codecs: 'avc1.42E01E,mp4a.40.2' },
      { uri: `${url}/variant2.m3u8`, bandwidth: 2000000, codecs: 'avc1.42E01E,mp4a.40.2' },
    ],
  };
}

// =============================================================================
// Orchestrator Setup
// =============================================================================

export function setupPlaylistResolution() {
  // Separate state containers for different concerns
  const presentation = createState<PresentationState>({
    url: undefined,
    data: undefined,
    error: undefined,
  });

  const platform = createState<PlatformObjects>({
    mediaElement: undefined,
    mediaSource: undefined,
  });

  // Track in-flight fetch
  let abortController: AbortController | null = null;
  let isFetching = false;

  // =============================================================================
  // Orchestration: Playlist Resolution
  // =============================================================================

  // Subscribe to presentation state changes
  presentation.subscribe((current) => {
    // Guard: Should we fetch?
    if (!isUnresolved(current) || isFetching) {
      return;
    }

    // Check preload policy from media element
    const { mediaElement } = platform.current;
    const preload = mediaElement?.preload ?? 'auto';

    if (preload === 'none') {
      // Don't fetch yet - wait for play event
      return;
    }

    // Start fetch
    isFetching = true;
    abortController?.abort();
    abortController = new AbortController();

    const { url } = current;

    (async () => {
      try {
        const data = await fetchPresentation(url, abortController!.signal);

        if (!abortController!.signal.aborted) {
          presentation.patch({ data });
          console.log(`[F1] Resolved presentation for ${url}:`, data);
        }
      } catch (error) {
        if (!abortController!.signal.aborted) {
          presentation.patch({ error: error as Error });
          console.error(`[F1] Failed to resolve presentation:`, error);
        }
      } finally {
        isFetching = false;
      }
    })();
  });

  // =============================================================================
  // Media Element Integration
  // =============================================================================

  // Subscribe to platform object changes
  platform.subscribe((current, previous) => {
    const { mediaElement } = current;
    const prevElement = previous.mediaElement;

    // Handle media element change
    if (mediaElement !== prevElement) {
      // Remove old listeners
      if (prevElement) {
        // In real implementation: removeEventListener calls
        console.log('[F1] Detached from previous media element');
      }

      // Add new listeners
      if (mediaElement) {
        // In real implementation: addEventListener calls
        console.log('[F1] Attached to new media element');

        // Sync preload attribute to trigger re-evaluation
        const preload = mediaElement.preload || 'auto';
        if (preload !== 'none' && presentation.current.url) {
          // Trigger fetch if conditions met
          presentation.patch({});
        }
      }
    }
  });

  // =============================================================================
  // Public API
  // =============================================================================

  return {
    /**
     * Load a presentation URL
     */
    load(url: string): void {
      presentation.patch({ url, data: undefined, error: undefined });
    },

    /**
     * Attach a media element
     */
    attach(element: HTMLMediaElement): void {
      platform.patch({ mediaElement: element });
    },

    /**
     * Get current presentation state
     */
    get presentation() {
      return presentation.current;
    },

    /**
     * Get current platform objects
     */
    get platform() {
      return platform.current;
    },

    /**
     * Cleanup
     */
    destroy(): void {
      abortController?.abort();
    },
  };
}

// =============================================================================
// Usage Example
// =============================================================================

if (typeof window !== 'undefined') {
  const orchestrator = setupPlaylistResolution();

  // Create and attach media element
  const video = document.createElement('video');
  video.preload = 'auto';
  orchestrator.attach(video);

  // Load a presentation
  orchestrator.load('https://example.com/playlist.m3u8');

  // Later: check resolution status
  setTimeout(() => {
    if (isResolved(orchestrator.presentation)) {
      console.log('Presentation resolved:', orchestrator.presentation.data);
    }
  }, 1000);
}

// =============================================================================
// Evaluation Notes
// =============================================================================

/**
 * ERGONOMICS ASSESSMENT:
 *
 * ✅ Pros:
 * - Clear separation of concerns (immutable state vs mutable objects)
 * - Type-safe with proper type guards
 * - Explicit control flow (no magic)
 * - Small bundle size (~3 KB total)
 * - Easy to debug and trace
 *
 * ⚠️ Pain Points:
 * - Manual coordination between two state containers
 * - Need to read from both `presentation.current` and `platform.current`
 * - Deduplication flag (`isFetching`) is manual
 * - Event listener management is manual
 * - No built-in cancellation management
 *
 * 🤔 Decision Point:
 * - Is this level of manual coordination acceptable for F1-F18?
 * - Or should we build minimal composition helpers (e.g., `combineSelectors`)?
 * - Or do we need a full signals/observables system?
 *
 * NEXT STEPS:
 * - If acceptable: Use this pattern for F1 implementation
 * - If too painful: Build minimal combineSelectors helper (~0.5 KB)
 * - If very painful: Consider minimal signals system (~2-3 KB)
 */
