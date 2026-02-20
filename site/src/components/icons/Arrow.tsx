interface IconProps extends React.SVGProps<SVGSVGElement> {
  width?: number | string;
}

export default function ArrowIcon({ width = 1, ...props }: IconProps) {
  return (
    <svg
      aria-label="Arrow icon"
      role="img"
      width={`${width}rem`}
      preserveAspectRatio="true"
      viewBox="0 0 62 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_503_2927)">
        <path d="M60 17L0 17" stroke="#1E1D1D" stroke-width="2" />
        <path d="M44 1L60 17.3019L44.5926 33" stroke="#1E1D1D" stroke-width="2" />
      </g>
      <defs>
        <clipPath id="clip0_503_2927">
          <rect width="62" height="34" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
