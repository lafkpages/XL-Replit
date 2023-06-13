import { api as replitProtocol } from '@replit/protocol';

export interface OTv1 {
  insert?: string;
  delete?: number;
  skip?: number;
}

export interface OTv2 {
  op: 'insert' | 'delete' | 'skip';
  value?: string;
  count?: number;
}

export type OT = OTv1 | OTv2;

export interface Diff {
  added?: boolean;
  value?: string;
  removed?: boolean;
  count?: number;
}

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

export interface ReplitReduxState {
  user?: {
    authModal?: {
      dismissed?: boolean;
      promptCount?: number;
      show?: boolean;
    };
    userInfo?: {
      bio?: string;
      captchaScore?: number;
      customThemeValues?: ReplitCustomThemeValues;
      customerId?: number;
      editorPreferences?: ReplitEditorPreferences;
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
      installedCustomThemeVersionId?: number;
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
    };
  };
}

export interface ReplitCustomThemeValues {
  editor: {
    syntaxHighlighting: ReplitThemeEditorValue[];
  };
  global: {
    [key: string]: string;
  };
}

export interface GraphQLResponse {
  __typename?: string;
  [key: string]: any;
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

// TODO [$64882183a4b7eb0009c714ff]: import from crypto
export type UUID = `${string}-${string}-${string}-${string}-${string}`;
