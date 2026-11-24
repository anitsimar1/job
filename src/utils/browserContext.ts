export const browserContext = {
  isEmbeddedIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  },
};
