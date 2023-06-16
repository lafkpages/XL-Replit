import type { GraphQLResponse } from "../types";

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
    for (const prop of replitThemeGlobalValuesProps) {
      const value = themeContainerStyles.getPropertyValue(
        getOtherVariable(prop, variation)
      );

      if (value) {
        if (!themeValues[prop]) {
          themeValues[prop] = {};
        }

        themeValues[prop]![variation] = value;
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

// Types

export interface ReplitCustomThemeValues {
  editor: {
    syntaxHighlighting: ReplitThemeEditorValue[];
  };
  global: {
    [key: string]: string;
  };
}

export interface ReplitThemeEditorValue {
  __typename?: 'ThemeEditorSyntaxHighlighting';
  values?: {
    [key: string]: string;
  };
  tags?: (GraphQLResponse & {
    __typename?: 'ThemeEditorTag';
    modifiers?: string[] | null;
    name?: string;
  })[];
}

export type ReplitThemeGlobalValuesProp = {
  [key in ReplitAccentVariation]?: string;
};

export type ReplitThemeGlobalValuesAccentsProp = {
  [key in ReplitAccent]?: {
    [key in ReplitAccentVariationBasic]?: string;
  };
};

export const replitThemeGlobalValuesProps = [
  'background',
  'foreground',
  'outline',
] as const;

export type ReplitThemeGlobalValuesProps = (typeof replitThemeGlobalValuesProps)[number];

export type ReplitThemeGlobalValues = {
  accents: ReplitThemeGlobalValuesAccentsProp;
} & {
  [key in ReplitThemeGlobalValuesProps]?: ReplitThemeGlobalValuesProp;
}

export const replitAccents = [
  'primary',
  'positive',
  'negative',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'blue',
  'blurple',
  'purple',
  'magenta',
  'pink',
  'grey',
  'brown',
] as const;

export type ReplitAccent = (typeof replitAccents)[number];

export const replitAccentVariationsBasic = [
  'dimmest',
  'dimmer',
  'default',
  'stronger',
  'strongest',
] as const;

export type ReplitAccentVariationBasic =
  (typeof replitAccentVariationsBasic)[number];

export const replitAccentVariations = [
  'root',
  ...replitAccentVariationsBasic,
  'overlay',
  'higher',
  'highest',
] as const;

export type ReplitAccentVariation = (typeof replitAccentVariations)[number];
