const privateProps = new WeakMap<object, Record<string, any>>();

export function getPrivate(instance: object) {
  return privateProps.get(instance) ?? setPrivate(instance, {});
}

export function setPrivate(instance: object, props: Record<string, any>) {
  let saved = privateProps.get(instance);
  if (!saved) privateProps.set(instance, (saved = {}));

  return Object.assign(saved, props);
}
