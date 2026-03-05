type Constructor<T = object> = new (...args: any[]) => T;

interface ContainerHost {
  connectedCallback(): void;
}

/** Create a mixin that provides store container behavior. */
export function createContainerMixin<T extends Constructor<ContainerHost>>(Base: T): T {
  return Base;
}
