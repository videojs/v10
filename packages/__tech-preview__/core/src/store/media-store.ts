import type { MediaStore } from './factory';

import { createMediaStore as factory } from './factory';
import { audible } from './mediators/audible';
import { fullscreenable } from './mediators/fullscreenable';
import { playable } from './mediators/playable';
import { preview } from './mediators/preview';
import { temporal } from './mediators/temporal';

// Example of default media store with default state mediator definitions. (CJP)
// NOTE: We can also change the API to take an array of stateMediators (or either/both) (CJP)
const stateMediator = { ...playable, ...audible, ...temporal, ...fullscreenable, ...preview };

type Params = Partial<Parameters<typeof factory>[0]>;

export function createMediaStore(params: Params = {}): MediaStore {
  return factory({
    stateMediator: stateMediator as any,
    ...params,
  });
}
