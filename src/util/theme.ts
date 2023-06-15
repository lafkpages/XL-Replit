import {
  ReplitThemeGlobalValues,
  replitAccentVariations,
  replitAccentVariationsBasic,
  replitAccents,
  ReplitAccent,
  ReplitAccentVariations,
} from '../types';

export function getAccentVariable(accent: ReplitAccent, variation: ReplitAccentVariations) {
  return `--accent-${accent}-${variation}`;
}

export function getBackgroundVariable(variation: ReplitAccentVariations) {
  return `--background-${variation}`;
}

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
        getAccentVariable(accent, variation)
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
      getBackgroundVariable(variation)
    );

    if (value) {
      themeValues.backgrounds[variation] = value;
    }
  }

  return themeValues;
}

export function applyGlobalThemeValuesToElement(themeValues: ReplitThemeGlobalValues, elm: HTMLElement) {
  for (const [accent, variations] of Object.entries(themeValues.accents)) {
    for (const [variation, value] of Object.entries(variations)) {
      elm.style.setProperty(getAccentVariable(accent as ReplitAccent, variation as ReplitAccentVariations), value);
    }
  }

  for (const [variation, value] of Object.entries(themeValues.backgrounds)) {
    elm.style.setProperty(getBackgroundVariable(variation as ReplitAccentVariations), value);
  }
}
