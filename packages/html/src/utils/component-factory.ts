import type { MediaStore } from '@videojs/core/store';
import { ConsumerMixin } from '@open-wc/context-protocol';

/**
 * Generic types for HTML component hooks pattern
 * Mirrors the React hooks architecture for consistency
 */
export type StateHook<T = any> = (mediaStore: MediaStore) => T;

export type PropsHook<T = any, P = any> = (state: T, element: HTMLElement) => P;

export interface ConnectedComponentConstructor<State> {
  new (state: State): HTMLElement;
}

let coreInstances: any[];
let getCoreStateCount: number;

/**
 * Generic factory function to create connected HTML components using hooks pattern.
 * Provides equivalent functionality to React's toConnectedComponent but for custom elements.
 *
 * @param BaseClass - Base custom element class to extend
 * @param stateHook - Hook that defines state keys and transformation logic
 * @param propsHook - Hook that handles element attributes and properties based on state
 * @param eventsHook - Hook that defines event handling logic
 * @param displayName - Display name for debugging
 * @returns Connected custom element class with media store integration
 */
export function toConnectedHTMLComponent<State = any>(
  BaseClass: CustomElementConstructor,
  stateHook: StateHook<State> | undefined,
  propsHook: PropsHook<State>,
  displayName?: string,
): ConnectedComponentConstructor<State> {
  const ConnectedComponent = class extends ConsumerMixin(BaseClass) {
    static get observedAttributes(): string[] {
      return [
        // @ts-expect-error ts(2339)
        ...(super.observedAttributes ?? []),
      ];
    }

    _mediaStore: any;
    _coreInstances = [];

    contexts = {
      mediaStore: (mediaStore: any) => {
        this._mediaStore = mediaStore;

        // Subscribe to media store state changes
        // Split into two phases: state transformation, then props update
        this._mediaStore.subscribe(() => {
          getCoreStateCount = 0;
          coreInstances = this._coreInstances;

          // Phase 1: Transform raw media store state (state concern)
          const state = stateHook?.(mediaStore) ?? mediaStore.getState();
          // Phase 2: Update element attributes/properties (props concern)
          const props = propsHook(state ?? {} as State, this);

          // @ts-expect-error any
          this._update(props, state, mediaStore);
        });
      },
    };

    connectedCallback(): void {
      super.connectedCallback?.();
    }

    disconnectedCallback(): void {
      super.disconnectedCallback?.();
    }

    handleEvent(event: CustomEvent): void {
      // @ts-expect-error any
      super.handleEvent?.(event);
    }
  };

  // Set display name for debugging and dev tools
  if (displayName) {
    Object.defineProperty(ConnectedComponent, 'name', { value: displayName });
  }

  return ConnectedComponent;
}

export function getCoreState<T extends {
  subscribe: (callback: (state: any) => void) => () => void;
  getState: () => any;
  setState: (state: any) => void;
}>(CoreClass: new () => T, state: any): any {
  let core = coreInstances[getCoreStateCount] as T;
  if (!core) {
    core = new CoreClass();
    coreInstances[getCoreStateCount] = core;
    getCoreStateCount++;
  }

  core.setState(state);
  return core.getState();
}
