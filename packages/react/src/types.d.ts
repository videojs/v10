declare global {
  namespace React {
    interface HTMLAttributes<T> {
      popover?: 'auto' | 'manual' | string;
      commandfor?: string;
    }
  }
}
