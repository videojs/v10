import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ColorBars from '../ColorBars';

describe('ColorBars', () => {
  it('renders five color rows', () => {
    const { container } = render(<ColorBars />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.children).toHaveLength(5);
  });

  it('marks the bars as decorative for assistive tech', () => {
    const { container } = render(<ColorBars />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the normal height by default', () => {
    const { container } = render(<ColorBars />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('h-52');
  });

  it('applies the short variant height', () => {
    const { container } = render(<ColorBars variant="short" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('h-25');
  });

  it('applies the extra-short variant height', () => {
    const { container } = render(<ColorBars variant="extra-short" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('h-20');
  });

  it('forwards className', () => {
    const { container } = render(<ColorBars className="md:col-start-2" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('md:col-start-2');
  });
});
