interface IconProps extends React.SVGProps<SVGSVGElement> {
  width?: string;
}

export default function CopyIcon({ width = '1', ...props }: IconProps) {
  return (
    <svg
      width={`${width}rem`}
      preserveAspectRatio="true"
      aria-label="Copy Icon"
      role="img"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="5" width="12" height="14" rx="1" stroke="#1E1D1D" />
      <path
        d="M3.5 15H3C2.44772 15 2 14.5523 2 14V2C2 1.44772 2.44772 1 3 1H13C13.5523 1 14 1.44772 14 2V2.5"
        stroke="#1E1D1D"
      />
      <path d="M9 10H15" stroke="#1E1D1D" />
      <path d="M9 12H15" stroke="#1E1D1D" />
      <path d="M9 14H12" stroke="#1E1D1D" />
    </svg>
  );
}
