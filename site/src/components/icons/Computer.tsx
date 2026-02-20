interface IconProps extends React.SVGProps<SVGSVGElement> {
  width?: string;
}

export default function Computer({ width: size = '2', ...props }: IconProps) {
  return (
    <svg
      aria-label="Computer icon"
      role="img"
      width={`${size}rem`}
      preserveAspectRatio="true"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="7" y="17" width="10" height="4" stroke="currentColor" />
      <rect x="2" y="3" width="20" height="14" rx="1" stroke="currentColor" />
      <path d="M2 14H22V16C22 16.5523 21.5523 17 21 17H3C2.44772 17 2 16.5523 2 16V14Z" stroke="currentColor" />
    </svg>
  );
}
