import { describe, expect, it } from 'vitest';
import { connectHtmlPopups } from '../html-markup';

describe('connectHtmlPopups', () => {
  it('connects adjacent controls to stable tooltip and popover ids', () => {
    const source = `<div>
  <media-play-button></media-play-button>
  <media-tooltip></media-tooltip>
  <media-seek-button seconds="-10"></media-seek-button>
  <media-tooltip></media-tooltip>
  <media-mute-button></media-mute-button>
  <media-popover></media-popover>
</div>`;

    expect(connectHtmlPopups(source)).toContain('<media-play-button commandfor="play-tooltip"></media-play-button>');
    expect(connectHtmlPopups(source)).toContain('<media-tooltip id="play-tooltip"></media-tooltip>');
    expect(connectHtmlPopups(source)).toContain('commandfor="seek-backward-tooltip"');
    expect(connectHtmlPopups(source)).toContain('id="volume-popover"');
  });
});
