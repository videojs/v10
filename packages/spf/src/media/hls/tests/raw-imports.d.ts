// Ambient declaration for Vite `?raw` imports, used by tests to load playlist
// fixtures as strings without pulling Node types into the framework-agnostic
// `media` project. Test-only — the media source itself imports no fixtures.
declare module '*?raw' {
  const content: string;
  export default content;
}
