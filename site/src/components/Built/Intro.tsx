export function Intro() {
  return (
    <div className="bg-faded-black border border-dark-manila p-15 rounded-sm">
      <p className="text-base text-light-manila">
        VideoJS 10 is complete ground-up rewrite of the player for the modern web. The UI is separated from the
        underlying media renderer. Every component is independent and works together through open API contracts. We've
        structured the project for modern JavaScript bundlers to support tree-shaking and intelligent code splitting.
        <br />
        <br />
        Start with a small player and only add what you need.
      </p>
    </div>
  );
}
