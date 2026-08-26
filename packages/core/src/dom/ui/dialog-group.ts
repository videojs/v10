export interface DialogGroupMember {
  /** Close because another dialog opened and return the element that should eventually regain focus. */
  closeForGroup: () => HTMLElement | null;
}

/** Coordinates the single active alert dialog within a player container. */
export interface DialogGroup {
  /** Make `member` current, close the previous member, and inherit its focus-restoration target. */
  open: (member: DialogGroupMember) => HTMLElement | null;
  /** Clear `member` if it is current. */
  close: (member: DialogGroupMember) => void;
}

export function createDialogGroup(): DialogGroup {
  let current: DialogGroupMember | null = null;

  return {
    open(member) {
      if (current === member) return null;

      const previous = current;

      current = member;

      return previous?.closeForGroup() ?? null;
    },

    close(member) {
      if (current === member) current = null;
    },
  };
}
