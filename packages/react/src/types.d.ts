declare global {
  namespace React {
    interface HTMLAttributes<_T> {
      popover?: 'auto' | 'manual' | string;
      commandfor?: string;
    }
  }
}
