interface IconProps extends React.SVGProps<SVGSVGElement> {
  width?: string;
}
export default function TriangleArrow({ width = '1', ...props }: IconProps) {
  return (
    <svg
      aria-label="Triangle Arrow Icon"
      role="img"
      width={`${width}rem`}
      preserveAspectRatio="true"
      viewBox="0 0 11 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M5.89965e-05 13.2492L10.3459 6.62451L5.97761e-05 4.54849e-05L5.89965e-05 13.2492Z" fill="#EFE6D2" />
    </svg>
  );
}
