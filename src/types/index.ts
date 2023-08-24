import { api as replitProtocol } from '@replit/protocol';
import {
  replitAccents,
  replitAccentVariations,
  replitAccentVariationsBasic,
  replitThemeGlobalValuesProps,
} from './theme';
import type {
  ReplitCustomThemeValues,
  ReplitThemeEditorValue,
  ReplitThemeGlobalValuesProp,
  ReplitThemeGlobalValuesAccentsProp,
  ReplitThemeGlobalValuesProps,
  ReplitThemeGlobalValues,
  ReplitAccent,
  ReplitAccentVariationBasic,
  ReplitAccentVariation,
} from './theme';

export {
  ReplitCustomThemeValues,
  ReplitThemeEditorValue,
  ReplitThemeGlobalValuesProp,
  ReplitThemeGlobalValuesAccentsProp,
  replitThemeGlobalValuesProps,
  ReplitThemeGlobalValuesProps,
  ReplitThemeGlobalValues,
  replitAccents,
  ReplitAccent,
  replitAccentVariationsBasic,
  ReplitAccentVariationBasic,
  replitAccentVariations,
  ReplitAccentVariation,
};

import type { OTv1, OTv2, OT, Diff } from './ot';

export { OTv1, OTv2, OT, Diff };

export interface GlobalNext {
  router: {
    back: () => {};
    push: (...args: any[]) => {};
    reload: () => {};
    state?: {
      route?: string;
      query?: {
        [key: string]: any;
      };
    };
  };
  emitter: {
    emit: Function;
    off: Function;
    on: Function;
  };
  version?: string;
}

export interface ReplitFlag {
  controlName: string;
  type: 'boolean' | 'multivariate';
  value: any;
}

// TODO
export type UserRole = string;

export interface UserInfo {
  bio?: string;
  captchaScore?: number;
  customThemeValues?: ReplitCustomThemeValues | null;
  customerId?: number | null;
  editorPreferences?: ReplitEditorPreferences | null;
  editor_preferences?: ReplitEditorPreferences | null;
  email?: string;
  emailHash?: string;
  emailNotifications?: boolean;
  error?: string;
  fetchState?: string;
  firstName?: string | null;
  gating: ReplitFlag[];
  icon?: {
    id?: number;
    url?: string;
  };
  id?: number;
  installedCustomThemeVersionId?: number | null;
  isLoggedIn?: boolean;
  isOverLimit?: boolean;
  isTeam?: boolean;
  isVerified?: boolean;
  lastName?: string | null;
  locale?: string;
  location?: string | null;
  replContinent?: string;
  roles?: UserRole[];
  signupMethod?: string;
  timeCreated?: string;
  username?: string;
}

export interface ReplitReduxState {
  user?: {
    authModal?: {
      dismissed?: boolean;
      promptCount?: number;
      show?: boolean;
    };
    userInfo?: UserInfo;
  };
}

export interface GraphQLResponse {
  __typename?: string;
  [key: string]: any;
}

export interface ReplitEditorPreferences {
  codeSuggestion?: boolean;
  extraDelight?: boolean;
  fontSize?: number;
  isLayoutStacked?: boolean;
  minimapDisplay?: 'characters' | 'blocks' | 'none';
  theme?: string;
  webviewAutoOpenOnPortOpened?: boolean;
  wrapping?: boolean;
}

export interface XLGovalChannel {
  handler?: (data: any) => void;
  openChanRes?: replitProtocol.Command;
}

export const xlSettings = [
  'show-advanced-settings',
  'account-switcher',
  'custom-tips',
  'old-cover-page',
  'show-experiments',
  'nix-modules-tool',
  'extensions-beta',
  'ssh-tool',
  'auto-debug',
  'force-ssr',
  'hide-bookish',
  'block-graphql',
  'disable-github-import',
  'large-cursor',
  'monaco-editor',
] as const;

export type XLSetting = (typeof xlSettings)[number];
export type XLSettings = {
  [key in XLSetting]?: boolean;

  // For now, settings are boolean. In the future,
  // maybe allow more types?
};

// TODO: import from crypto
export type UUID = `${string}-${string}-${string}-${string}-${string}`;
