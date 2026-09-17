import { describe, it } from 'vite-plus/test';

import { Title } from '../index';

describe('Title', () => {
  it('owns its text content and rejects children', () => {
    <Title />;
    <Title className="title" data-testid="title" />;

    // @ts-expect-error The resolved title is the only text content; set it on the player instead.
    <Title>Custom title</Title>;
  });
});
