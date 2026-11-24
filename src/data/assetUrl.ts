declare global {
  interface Window {
    __rouletteFiles?: Record<string, string>;
  }
}

export const isStandalone = () => Boolean(window.__rouletteFiles);
export const assetUrl = (path: string) => window.__rouletteFiles?.[path] ?? path;
