import { applyGlobalThemeValuesToElement } from './theme';
import type { ReplitThemeGlobalValues } from './theme';

export default function applySavedTheme(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Get theme
    chrome.storage.local
      .get(['themeValues'])
      .then(({ themeValues }: { themeValues?: ReplitThemeGlobalValues }) => {
        if (!themeValues) {
          resolve(false);
          return;
        }

        // Apply theme
        applyGlobalThemeValuesToElement(themeValues, document.documentElement);

        // Resolve
        resolve(true);
      })
      .catch(reject);
  });
}
