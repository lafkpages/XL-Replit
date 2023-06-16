import {
  ReplitThemeGlobalValues,
  ReplitThemeGlobalValuesProp,
  replitAccentVariations,
  replitAccentVariationsBasic,
  replitAccents,
  ReplitAccent,
  ReplitAccentVariation,
} from '../types';

export function getAccentVariable(
  accent: ReplitAccent,
  variation: ReplitAccentVariation
) {
  return `--accent-${accent}-${variation}`;
}

export function getOtherVariable(
  prop: string,
  variation: ReplitAccentVariation
) {
  return `--${prop}-${variation}`;
}

export function getThemeGlobalValues(elm?: HTMLElement) {
  const themeContainerStyles = getComputedStyle(
    elm ||
      document.querySelector('.replit-ui-theme-root') ||
      document.documentElement
  );

  const themeValues: ReplitThemeGlobalValues = {
    accents: {},
    background: {},
    foreground: {},
    outline: {},
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

  const otherProps = ['background', 'foreground', 'outline'] as const;

  for (const variation of replitAccentVariations) {
    for (const prop of otherProps) {
      const value = themeContainerStyles.getPropertyValue(
        getOtherVariable(prop, variation)
      );

      if (value) {
        themeValues[prop][variation] = value;
      }
    }
  }

  return themeValues;
}

export function applyGlobalThemeValuesToElement(
  themeValues: ReplitThemeGlobalValues,
  elm: HTMLElement
) {
  for (const [accent, variations] of Object.entries(themeValues.accents)) {
    for (const [variation, value] of Object.entries(variations)) {
      elm.style.setProperty(
        getAccentVariable(
          accent as ReplitAccent,
          variation as ReplitAccentVariation
        ),
        value
      );
    }
  }

  for (const [prop, value] of Object.entries(themeValues)) {
    if (prop == 'accents') continue;

    for (const [variation, variationValue] of Object.entries(value)) {
      // Yet another TypeScript's unnecessary freaks: https://github.com/microsoft/TypeScript/issues/26255
      if (!([...replitAccentVariations] as string[]).includes(variation)) {
        continue;
      }

      elm.style.setProperty(
        getOtherVariable(prop, variation as ReplitAccentVariation),
        variationValue as string
      );
    }
  }
}
