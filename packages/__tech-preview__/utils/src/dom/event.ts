export function isOutsideEvent(event: FocusEvent, container?: Element): boolean {
  const containerElement = container || (event.currentTarget as Element);
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  return !relatedTarget || !containerElement.contains(relatedTarget);
}
