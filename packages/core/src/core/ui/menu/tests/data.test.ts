import { describe, expect, it } from 'vite-plus/test';

import { MenuContentDataAttrs, MenuDataAttrs } from '../data';

describe('MenuContentDataAttrs', () => {
  it('exposes open logical child state to Content and component transforms', () => {
    expect(MenuContentDataAttrs.childOpen).toBe('data-child-open');
    expect(MenuDataAttrs.childOpen).toBe(MenuContentDataAttrs.childOpen);
  });
});
