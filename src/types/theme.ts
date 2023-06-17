import type { GraphQLResponse } from '.';

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

export type ReplitThemeGlobalValuesProps =
  (typeof replitThemeGlobalValuesProps)[number];

export type ReplitThemeGlobalValues = {
  accents: ReplitThemeGlobalValuesAccentsProp;
} & {
  [key in ReplitThemeGlobalValuesProps]?: ReplitThemeGlobalValuesProp;
};

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
