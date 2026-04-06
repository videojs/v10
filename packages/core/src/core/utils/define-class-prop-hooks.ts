import type { Constructor } from '@videojs/utils/types';

export function defineClassPropHooks<T extends Constructor<any>>(Class: T, BaseClassProto: PropertyDescriptorMap) {
  for (const prop of Object.getOwnPropertyNames(BaseClassProto)) {
    if (prop in Class.prototype || prop.startsWith('_')) continue;

    const descriptor = Object.getOwnPropertyDescriptor(BaseClassProto, prop);
    if (!descriptor) continue;

    const config: PropertyDescriptor = {};
    if (typeof descriptor.value === 'function') {
      config.value = function (this: InstanceType<T>, ...args: any[]) {
        return this.call?.(prop, ...args);
      };
    } else if (descriptor.get) {
      config.get = function (this: InstanceType<T>) {
        return this.get?.(prop);
      };

      if (descriptor.set) {
        config.set = function (this: InstanceType<T>, val: any) {
          this.set?.(prop, val);
        };
      }
    }

    Object.defineProperty(Class.prototype, prop, config);
  }
}
