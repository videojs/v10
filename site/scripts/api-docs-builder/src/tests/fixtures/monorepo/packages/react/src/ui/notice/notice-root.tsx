class NoticeCore {}

/** Provides notice state to parts from another component. */
export function NoticeRoot() {
  const core = new NoticeCore();
  return core;
}

export type NoticeRootProps = {};
