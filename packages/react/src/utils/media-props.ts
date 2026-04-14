import type { Media } from '@videojs/core';

type AnyClass = abstract new (...args: any[]) => any;

function getSettableProps(DelegateClass: AnyClass): Set<string> {
  const props = new Set<string>();
  for (let proto = DelegateClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc?.set) props.add(key);
    }
  }
  return props;
}

export function mediaProps(media: Media, DelegateClass: AnyClass, props: Record<string, any>) {
  const delegateKeys = getSettableProps(DelegateClass);
  const rest: Record<string, any> = {};

  for (const key of Object.keys(props)) {
    if (delegateKeys.has(key)) {
      const value = props[key];
      if ((media as any)[key] !== value) {
        (media as any)[key] = value;
      }
    } else {
      rest[key] = props[key];
    }
  }

  return rest;
}
