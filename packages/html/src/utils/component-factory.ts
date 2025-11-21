import type { MediaStore } from '@videojs/core/store';
import { ConsumerMixin } from '@open-wc/context-protocol';
import { shallowEqual, toCamelCase } from '@videojs/utils';

/**
 * Generic types for HTML component hooks pattern
 * Mirrors the React hooks architecture for consistency
 */
export type StateHook<E extends HTMLElement, T = any> = (element: E, mediaStore: MediaStore) => T;

export type PropsHook<E extends HTMLElement, T = any, P = any> = (element: E, state: T) => P;

export interface ConnectedComponentConstructor<E extends HTMLElement, State> {
  new (state: State): E;
}

let currentCoreInstances: any[] = [];
// There might be multiple getCoreState calls in a single state hook
// which should create a different core instance.
let currentCoreIndex: number = 0;

/**
 * Generic factory function to create connected HTML components using hooks pattern.
 * Provides equivalent functionality to React's toConnectedComponent but for custom elements.
 *
 * @param BaseClass - Base custom element class to extend
 * @param stateHook - Hook that defines state keys and transformation logic
 * @param propsHook - Hook that handles element attributes and properties based on state
 * @param displayName - Display name for debugging
 * @returns Connected custom element class with media store integration
 */
export function toConnectedHTMLComponent<E extends HTMLElement, State = any>(
  BaseClass: CustomElementConstructor,
  stateHook: StateHook<E, State> | undefined,
  propsHook: PropsHook<E, State>,
  displayName?: string,
): ConnectedComponentConstructor<E, State> {
  const ConnectedComponent = class extends ConsumerMixin(BaseClass) {
    static get observedAttributes(): string[] {
      return [
        // @ts-expect-error ts(2339)
        ...(super.observedAttributes ?? []),
      ];
    }

    #mediaStore: MediaStore | undefined;
    #coreInstances: { core: any; listening: boolean }[] = [];

    contexts = {
      mediaStore: (mediaStore: any) => {
        this.#mediaStore = mediaStore;

        // Subscribe to media store state changes
        mediaStore.subscribe(() => {
          this.#render();

          for (const instance of this.#coreInstances) {
            if (!instance.listening) {
              instance.listening = true;
              instance.core.subscribe(this.#render);
            }
          }
        });
      },
    };

    #render = (): void => {
      if (!this.#mediaStore) return;

      currentCoreIndex = 0;
      currentCoreInstances = this.#coreInstances;

      // Split into two phases: state transformation, then props update
      const state = stateHook?.(this as unknown as E, this.#mediaStore);
      const props = propsHook(this as unknown as E, state ?? {} as State);
      // @ts-expect-error any
      this._update(props, state, this.#mediaStore);
    };

    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
      super.attributeChangedCallback?.(name, oldValue, newValue);
      this.#render();
    }

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

  return ConnectedComponent as unknown as ConnectedComponentConstructor<E, State>;
}

export function getCoreState<T extends {
  subscribe: (callback: (state: any) => void) => () => void;
  getState: () => any;
  setState: (state: any) => void;
}>(CoreClass: new () => T, state: any): any {
  let core = currentCoreInstances[currentCoreIndex]?.core as T;
  if (!core) {
    core = new CoreClass();
    currentCoreInstances[currentCoreIndex] = { core, listening: false };
  }

  currentCoreIndex++;

  const coreState = core.getState();
  const oldState: Record<string, any> = {};
  for (const key in state) {
    oldState[key] = coreState[key];
  }
  // Only set the state if it has changed
  if (!shallowEqual(oldState, state)) {
    core.setState(state);
  }

  return core.getState();
}

export function getPropsFromAttrs(element: HTMLElement): Record<string, any> {
  const props: Record<string, any> = {};
  for (const attr of element.attributes) {
    props[toCamelCase(attr.name)] = element[toCamelCase(attr.name) as keyof typeof element];
  }
  return props;
}
