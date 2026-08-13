import { describe, expect, it } from 'vitest';
import type { PlayerContextValue } from '../../index';
import * as ReactApi from '../../index';

// @ts-expect-error Popup coordination is not player context.
type PlayerContextPopupGroup = PlayerContextValue['popupGroup'];

void (0 as unknown as PlayerContextPopupGroup);

describe('@videojs/react player exports', () => {
  it('preserves the established player context API', () => {
    expect(ReactApi).toHaveProperty('usePlayerContext');
    expect(ReactApi).toHaveProperty('useOptionalContainer');
  });
});
