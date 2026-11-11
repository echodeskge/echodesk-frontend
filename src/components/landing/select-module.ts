/**
 * Feature card → pricing builder hand-off. A card links to `#pricing` and
 * announces its module key; the builder listens and switches it on. Kept
 * as a DOM event so the sections stay independent client components.
 */
export const SELECT_MODULE_EVENT = 'echodesk:select-module';

export function requestModule(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(SELECT_MODULE_EVENT, { detail: key }));
}

export function onModuleRequest(handler: (key: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(SELECT_MODULE_EVENT, listener);
  return () => window.removeEventListener(SELECT_MODULE_EVENT, listener);
}
