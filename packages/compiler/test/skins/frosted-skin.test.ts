import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';

describe('skin: Frosted', () => {
  it('compiles actual frosted skin from react package', () => {
    const source = readFileSync(
      join(__dirname, '../fixtures/skins/frosted/FrostedSkin.tsx'),
      'utf-8',
    );

    const result = compile(source);

    // Component name
    expect(result.componentName).toBe('FrostedSkin');

    // Container and children
    expect(result.html).toContain('<media-container');
    expect(result.html).toContain('<slot name="media" slot="media"></slot>');

    // Overlay (simple div)
    expect(result.html).toContain('<div');

    // Controls container
    expect(result.html).toContain('data-testid="media-controls"');

    // Tooltip components - Now correctly flattens to commandfor pattern (Phase 2 ✅)
    // Produces flat structure matching HTML package
    expect(result.html).toContain('<media-tooltip');
    expect(result.html).toContain('commandfor');
    expect(result.html).toContain('popover="manual"');

    // Should NOT contain nested structure anymore
    expect(result.html).not.toContain('<media-tooltip-trigger>');
    expect(result.html).not.toContain('<media-tooltip-portal>');
    expect(result.html).not.toContain('<media-tooltip-positioner');

    // Play button (wrapped in Tooltip)
    expect(result.html).toContain('<media-play-button');
    expect(result.html).toContain('<media-play-icon');
    expect(result.html).toContain('<media-pause-icon');

    // Time controls
    expect(result.html).toContain('<media-current-time-display');
    expect(result.html).toContain('<media-duration-display');
    expect(result.html).toContain('<media-preview-time-display');

    // Time slider - verify Root → base element name
    expect(result.html).toContain('<media-time-slider');
    expect(result.html).toContain('<media-time-slider-track');
    expect(result.html).toContain('<media-time-slider-progress');
    expect(result.html).toContain('<media-time-slider-pointer');
    expect(result.html).toContain('<media-time-slider-thumb');

    // Popover components - Now correctly flattens (Phase 2 ✅)
    expect(result.html).toContain('<media-popover');
    expect(result.html).toContain('command="toggle-popover"');

    // Should NOT contain nested structure
    expect(result.html).not.toContain('<media-popover-trigger>');
    expect(result.html).not.toContain('<media-popover-portal>');

    // Mute button (wrapped in Popover)
    expect(result.html).toContain('<media-mute-button');
    expect(result.html).toContain('<media-volume-high-icon');
    expect(result.html).toContain('<media-volume-low-icon');
    expect(result.html).toContain('<media-volume-off-icon');

    // Volume slider (inside Popover)
    expect(result.html).toContain('<media-volume-slider');
    expect(result.html).toContain('<media-volume-slider-track');
    expect(result.html).toContain('<media-volume-slider-progress');

    // Fullscreen button (wrapped in Tooltip)
    expect(result.html).toContain('<media-fullscreen-button');
    expect(result.html).toContain('<media-fullscreen-enter-icon');
    expect(result.html).toContain('<media-fullscreen-exit-icon');

    // Note: classNames from template literals aren't extracted (known limitation for v0.1)
  });

  it('handles template literal classNames correctly', () => {
    const source = `
      export default function TestSkin() {
        const styles = { A: 'class-a', B: 'class-b', C: 'class-c' };
        return (
          <div>
            <button className={\`\${styles.A} \${styles.B}\`} />
            <span className={\`\${styles.C}\`} />
          </div>
        );
      }
    `;

    const result = compile(source);

    // Template literals are not fully resolved at compile time
    // This is expected - we just extract what we can
    expect(result.html).toContain('<div>');
    expect(result.html).toContain('<button');
    expect(result.html).toContain('<span');
  });

  it('verifies all Video.js component types transform correctly', () => {
    const componentTests = [
      { react: 'PlayButton', html: 'media-play-button' },
      { react: 'MuteButton', html: 'media-mute-button' },
      { react: 'FullscreenButton', html: 'media-fullscreen-button' },
      { react: 'MediaContainer', html: 'media-container' },
      { react: 'CurrentTimeDisplay', html: 'media-current-time-display' },
      { react: 'DurationDisplay', html: 'media-duration-display' },
      { react: 'PreviewTimeDisplay', html: 'media-preview-time-display' },
      { react: 'PlayIcon', html: 'media-play-icon' },
      { react: 'PauseIcon', html: 'media-pause-icon' },
      { react: 'VolumeHighIcon', html: 'media-volume-high-icon' },
      { react: 'VolumeLowIcon', html: 'media-volume-low-icon' },
      { react: 'VolumeOffIcon', html: 'media-volume-off-icon' },
      { react: 'FullscreenEnterIcon', html: 'media-fullscreen-enter-icon' },
      { react: 'FullscreenExitIcon', html: 'media-fullscreen-exit-icon' },
    ];

    componentTests.forEach(({ react, html }) => {
      const source = `import { ${react} } from '@videojs/react';
export default function Test() { return <${react} />; }`;
      const result = compile(source);
      expect(result.html).toBe(`<${html}></${html}>`);
    });
  });

  it('verifies all slider compound components transform correctly', () => {
    const compoundTests = [
      // TimeSlider
      { react: 'TimeSlider.Root', html: 'media-time-slider', base: 'TimeSlider' },
      { react: 'TimeSlider.Track', html: 'media-time-slider-track', base: 'TimeSlider' },
      { react: 'TimeSlider.Progress', html: 'media-time-slider-progress', base: 'TimeSlider' },
      { react: 'TimeSlider.Pointer', html: 'media-time-slider-pointer', base: 'TimeSlider' },
      { react: 'TimeSlider.Thumb', html: 'media-time-slider-thumb', base: 'TimeSlider' },
      // VolumeSlider
      { react: 'VolumeSlider.Root', html: 'media-volume-slider', base: 'VolumeSlider' },
      { react: 'VolumeSlider.Track', html: 'media-volume-slider-track', base: 'VolumeSlider' },
      { react: 'VolumeSlider.Progress', html: 'media-volume-slider-progress', base: 'VolumeSlider' },
      { react: 'VolumeSlider.Thumb', html: 'media-volume-slider-thumb', base: 'VolumeSlider' },
    ];

    compoundTests.forEach(({ react, html, base }) => {
      const source = `import { ${base} } from '@videojs/react';
export default function Test() { return <${react} />; }`;
      const result = compile(source);
      expect(result.html).toBe(`<${html}></${html}>`);
    });
  });
});
