/**
 * Generic actor types.
 *
 * An actor owns its snapshot (finite status + non-finite context) and
 * notifies observers when it changes. Mirrors the XState snapshot model:
 * `snapshot.status` is the bounded operational mode, `snapshot.context`
 * holds arbitrary non-finite data.
 */

/** Complete actor snapshot: finite status + non-finite context. */
export interface ActorSnapshot<Status extends string, Context> {
  status: Status;
  context: Context;
}

/** Generic actor interface: owns its snapshot and notifies observers. */
export interface Actor<Status extends string, Context> {
  /** Current snapshot. */
  readonly snapshot: ActorSnapshot<Status, Context>;

  /**
   * Subscribe to snapshot changes. Fires immediately with the current
   * snapshot, then on every subsequent change.
   *
   * @returns Unsubscribe function.
   */
  subscribe(listener: (snapshot: ActorSnapshot<Status, Context>) => void): () => void;

  /** Tear down the actor. */
  destroy(): void;
}
