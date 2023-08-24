// /----------------------------------------------------\
// | TODO: Make these type defs only apply to inject.ts |
// \----------------------------------------------------/

import type {
  GlobalNext,
  ReplitFlag,
  GraphQLResponse,
  UserInfo,
} from './types';

declare global {
  var next: undefined | GlobalNext;

  var __NEXT_DATA__:
    | undefined
    | {
        appGip: boolean;
        assetPrefix: string;
        buildId: string;
        customServer: boolean;
        gip: boolean;
        isFallback: boolean;
        page: string;
        props: {
          apolloClient?: any;
          apolloState?: {
            [key: string]: GraphQLResponse;
          };
          flags?: ReplitFlag[];
          pageProps?: {};
          user?: UserInfo;
          userAgent?: string;
        };
        query: {
          [key: string]: string;
        };
        scriptLoader: [];
      };

  var __REPLIT__USER_FLAGS__:
    | {
        flags?: ReplitFlag[];
        userId?: UserInfo['id'];
      }
    | undefined;

  // TODO: use type defs from monaco-editor
  var monaco:
    | undefined
    | {
        editor: {
          create: Function;
          createModel: Function;
          defineTheme: Function;
          getEditors: Function;
          setTheme: Function;
        };
        Uri: {
          file: (path: string) => any;
        };
      };

  var module: {
    exports: any;
  };

  var PRODUCTION: boolean;
}

export {};
