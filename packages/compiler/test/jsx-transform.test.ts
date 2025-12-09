import { describe, expect, it } from 'vitest';
import { compileForTest as compile } from './helpers/compile';

describe('jSX Transformation', () => {
  describe('element Name Transformation', () => {
    it('transforms custom elements to kebab-case with media- prefix', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        export default function TestSkin() {
          return <PlayButton />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<media-play-button></media-play-button>');
    });

    it('transforms compound components correctly', () => {
      const source = `
        import { TimeSlider } from '@videojs/react';
        export default function TestSkin() {
          return <TimeSlider.Root><TimeSlider.Track /></TimeSlider.Root>;
        }
      `;

      const result = compile(source);
      // Root maps to base element name without -root suffix
      expect(result.html).toBe(
        '<media-time-slider>\n  <media-time-slider-track></media-time-slider-track>\n</media-time-slider>',
      );
    });

    it('preserves built-in elements unchanged', () => {
      const source = `
        export default function TestSkin() {
          return <div><button><span>Text</span></button></div>;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<div>\n  <button>\n    <span>Text</span>\n  </button>\n</div>');
    });
  });

  describe('attribute Transformation', () => {
    it('transforms className to class', () => {
      const source = `
        export default function TestSkin() {
          return <div className="container" />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<div class="container"></div>');
      expect(result.classNames).toContain('container');
    });

    it('extracts className from member expression', () => {
      const source = `
        const styles = { Button: 'button' };
        export default function TestSkin() {
          return <div className={styles.Button} />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<div class="button"></div>');
      expect(result.classNames).toContain('button');
    });

    it('converts camelCase attributes to kebab-case', () => {
      const source = `
        export default function TestSkin() {
          return <div dataTestId="test" ariaLabel="Label" />;
        }
      `;

      const result = compile(source);
      expect(result.html).toContain('data-test-id="test"');
      expect(result.html).toContain('aria-label="Label"');
    });

    it('handles numeric attribute values', () => {
      const source = `
        export default function TestSkin() {
          return <div delay={200} />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<div delay="200"></div>');
    });

    it('handles boolean attribute values', () => {
      const source = `
        export default function TestSkin() {
          return <button disabled={true} />;
        }
      `;

      const result = compile(source);
      // Boolean true outputs as standard HTML boolean attribute (no value)
      expect(result.html).toBe('<button disabled></button>');
    });

    it('handles boolean attributes without value', () => {
      const source = `
        export default function TestSkin() {
          return <button disabled />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<button disabled></button>');
    });
  });

  describe('children Transformation', () => {
    it('transforms {children} to slot element', () => {
      const source = `
        export default function TestSkin({ children }) {
          return <div>{children}</div>;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<div>\n  <slot name="media" slot="media"></slot>\n</div>');
    });

    it('preserves text content', () => {
      const source = `
        export default function TestSkin() {
          return <button>Click Me</button>;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<button>Click Me</button>');
    });

    it('handles nested elements', () => {
      const source = `
        export default function TestSkin() {
          return (
            <div>
              <button>
                <span>Icon</span>
                <span>Text</span>
              </button>
            </div>
          );
        }
      `;

      const result = compile(source);
      expect(result.html).toBe(
        '<div>\n  <button>\n    <span>Icon</span>\n    <span>Text</span>\n  </button>\n</div>',
      );
    });
  });

  describe('self-Closing Elements', () => {
    it('converts self-closing elements to explicit closing tags', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        export default function TestSkin() {
          return <PlayButton />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<media-play-button></media-play-button>');
    });

    it('handles self-closing built-in elements', () => {
      const source = `
        export default function TestSkin() {
          return <img src="test.jpg" />;
        }
      `;

      const result = compile(source);
      expect(result.html).toBe('<img src="test.jpg"></img>');
    });
  });

  describe('complex Examples', () => {
    it('handles compound components with className and children', () => {
      const source = `
        import { TimeSlider } from '@videojs/react';
        const styles = {
          Root: 'root',
          Track: 'track',
          Progress: 'progress'
        };

        export default function TestSkin({ children }) {
          return (
            <div>
              {children}
              <TimeSlider.Root className={styles.Root}>
                <TimeSlider.Track className={styles.Track}>
                  <TimeSlider.Progress className={styles.Progress} />
                </TimeSlider.Track>
              </TimeSlider.Root>
            </div>
          );
        }
      `;

      const result = compile(source);

      expect(result.html).toContain('<slot name="media" slot="media"></slot>');
      expect(result.html).toContain('<media-time-slider class="root">');
      expect(result.html).toContain('<media-time-slider-track class="track">');
      expect(result.html).toContain('<media-time-slider-progress class="progress">');
      expect(result.classNames).toEqual(expect.arrayContaining(['root', 'track', 'progress']));
    });

    it('handles mixed built-in and custom elements', () => {
      const source = `
        import { PlayButton, MuteButton, VolumeSlider } from '@videojs/react';
        export default function TestSkin() {
          return (
            <div className="wrapper">
              <PlayButton className="play-btn" />
              <div className="controls">
                <MuteButton />
                <VolumeSlider.Root>
                  <VolumeSlider.Track />
                </VolumeSlider.Root>
              </div>
            </div>
          );
        }
      `;

      const result = compile(source);

      expect(result.html).toContain('<div class="wrapper">');
      expect(result.html).toContain('<media-play-button class="play-btn">');
      expect(result.html).toContain('<media-mute-button>');
      expect(result.html).toContain('<media-volume-slider>');
      expect(result.classNames).toEqual(expect.arrayContaining(['wrapper', 'play-btn', 'controls']));
    });
  });

  describe('cSS Generation', () => {
    it.skip('generates placeholder CSS for extracted classNames (CSS generates template reference, not actual rules)', () => {
      const source = `
        export default function TestSkin() {
          return <div className="container button" />;
        }
      `;

      const result = compile(source);

      expect(result.css).toContain('.button {');
      expect(result.css).toContain('.container {');
      expect(result.css).toContain('/* TODO: Add styles */');
    });

    it('sorts classNames alphabetically', () => {
      const source = `
        export default function TestSkin() {
          return (
            <div>
              <div className="zebra" />
              <div className="apple" />
              <div className="mango" />
            </div>
          );
        }
      `;

      const result = compile(source);
      const classOrder = result.classNames;

      expect(classOrder).toEqual(['apple', 'mango', 'zebra']);
    });

    it.skip('handles empty classNames gracefully (CSS generates template reference, not comments)', () => {
      const source = `
        export default function TestSkin() {
          return <div>No classes</div>;
        }
      `;

      const result = compile(source);

      expect(result.classNames).toEqual([]);
      expect(result.css).toContain('/* No classes found */');
    });
  });

  describe('component Name Extraction', () => {
    it('extracts component name from default export', () => {
      const source = `
        export default function MediaSkinMinimal() {
          return <div />;
        }
      `;

      const result = compile(source);
      expect(result.componentName).toBe('MediaSkinMinimal');
    });

    it('handles arrow function components', () => {
      const source = `
        export default () => <div />;
      `;

      const result = compile(source);
      // Arrow functions without name will be 'UnknownComponent'
      expect(result.componentName).toBe('UnknownComponent');
      expect(result.html).toBe('<div></div>');
    });
  });
});
