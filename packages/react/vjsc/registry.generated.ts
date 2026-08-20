import { schema } from '@videojs/core/vjsc';
import * as entries from './entries.generated';
import { createRegistry } from './registry';

/** Canonical core components rendered through the generated React registry metadata. */
export const registry = createRegistry(schema, entries);
