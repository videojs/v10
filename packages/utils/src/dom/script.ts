export function hasScript(src: string): boolean {
  return document.querySelector(`script[src="${src}"]`) !== null;
}

export function loadScript(src: string): Promise<void> {
  if (hasScript(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
