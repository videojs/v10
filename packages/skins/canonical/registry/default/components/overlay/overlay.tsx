export function Overlay() {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 [background-image:linear-gradient(to_top,oklch(0_0_0/0.5),oklch(0_0_0/0.3)_25%,transparent)] [transition-property:opacity,backdrop-filter] [transition-duration:var(--controls-transition-duration)] [transition-timing-function:ease-out] peer-data-visible/controls:opacity-100 peer-data-visible/buffering:bg-black/35 peer-data-visible/buffering:opacity-100 peer-data-visible/buffering:[backdrop-filter:blur(4px)] peer-data-open/error:opacity-100 peer-data-open/error:[backdrop-filter:blur(16px)_saturate(1.5)]" />
  );
}
