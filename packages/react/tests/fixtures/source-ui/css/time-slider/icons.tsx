import type { CSSProperties, SVGProps } from 'react';

export const SpinnerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth={2}
    aria-hidden="true"
    viewBox="0 0 18 18"
    {...props}
  >
    <style>
      {
        '@keyframes media-spinner-fade{0%{opacity:1}to{opacity:0}}.media-spinner__segment{animation:var(--media-spinner-animation, media-spinner-fade 1s linear infinite);animation-delay:var(--media-spinner-delay)}'
      }
    </style>
    <path
      d="M9 1.5v3"
      className="media-spinner__segment"
      opacity={0.5}
      style={
        {
          '--media-spinner-delay': '0s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="m14.5 3.5-2 2"
      className="media-spinner__segment"
      opacity={0.45}
      style={
        {
          '--media-spinner-delay': '0.125s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="M16.5 9h-3"
      className="media-spinner__segment"
      opacity={0.4}
      style={
        {
          '--media-spinner-delay': '0.25s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="m14.5 14.5-2-2"
      className="media-spinner__segment"
      opacity={0.35}
      style={
        {
          '--media-spinner-delay': '0.375s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="M9 16.5v-3"
      className="media-spinner__segment"
      opacity={0.3}
      style={
        {
          '--media-spinner-delay': '0.5s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="m3.5 14.5 2-2"
      className="media-spinner__segment"
      opacity={0.25}
      style={
        {
          '--media-spinner-delay': '0.625s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="M1.5 9h3"
      className="media-spinner__segment"
      opacity={0.15}
      style={
        {
          '--media-spinner-delay': '0.75s',
        } as CSSProperties & Record<string, string | number>
      }
    />
    <path
      d="m3.5 3.5 2 2"
      className="media-spinner__segment"
      opacity={0.1}
      style={
        {
          '--media-spinner-delay': '0.875s',
        } as CSSProperties & Record<string, string | number>
      }
    />
  </svg>
);
