import type {
  GlobalNext,
  ReplitFlag,
  ReplitReduxState,
  GraphQLResponse,
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
          reduxState?: ReplitReduxState;
          reduxStore?: any;
          userAgent?: string;
        };
        query: {
          [key: string]: string;
        };
        scriptLoader: [];
      };

  var __REPLIT_REDUX_STORE__:
    | undefined
    | {
        dispatch: Function;
        getState: () => ReplitReduxState;
        replaceReducer: Function;
        subscribe: Function;
        // [Symbol('observable')]: Function;
      };

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
}

export {};
