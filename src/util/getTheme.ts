import {
  ReplitThemeGlobalValues,
  replitAccentVariations,
  replitAccentVariationsBasic,
  replitAccents,
} from '../types';

export function getThemeGlobalValues(elm?: HTMLElement) {
  const themeContainerStyles = getComputedStyle(
    elm ||
      document.querySelector('.replit-ui-theme-root') ||
      document.documentElement
  );

  const themeValues: ReplitThemeGlobalValues = {
    accents: {},
    backgrounds: {},
  };

  for (const accent of replitAccents) {
    for (const variation of replitAccentVariationsBasic) {
      const value = themeContainerStyles.getPropertyValue(
        `--accent-${accent}-${variation}`
      );

      if (value) {
        if (!themeValues.accents[accent]) {
          themeValues.accents[accent] = {};
        }

        themeValues.accents[accent]![variation] = value;
      }
    }
  }

  for (const variation of replitAccentVariations) {
    const value = themeContainerStyles.getPropertyValue(
      `--background-${variation}`
    );

    if (value) {
      themeValues.backgrounds[variation] = value;
    }
  }

  return themeValues;
}
