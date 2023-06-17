import type { XLSettings } from "./types";

export const REPLIT_ORIGINS = [
  'https://replit.com',
  'https://firewalledreplit.com',
  'https://staging.replit.com',
];
export const REPLIT_URLS = REPLIT_ORIGINS.map((url) => url + '/*');

// XL Replit main backend
export const BACKEND = 'https://xl-replit-backend.luisafk.repl.co';

// ToS;DR Replit service ID
export const TOSDR_SERVICE_ID = 1676;

// Hash to add to the URL when setting flags
export const SET_FLAGS_HASH = 'xl-set-flags';

// RegEx to match a Goval WebSocket URL
export const REPLIT_GOVAL_URL_REGEX = /^wss?:\/\/.+?\/wsv2\/v2\.public\..+?$/;

// Default XL settings
export const DEFAULT_SETTINGS: XLSettings = {
  'show-advanced-settings': false,
  'account-switcher': true,
  'custom-tips': true,
  'old-cover-page': false,
  'show-experiments': false,
  'nix-modules-tool': false,
  'extensions-beta': false,
  'ssh-tool': false,
  'auto-debug': false,
  'force-ssr': false,
  'hide-bookish': false,
  'block-graphql': false,
  'disable-github-import': false,
  'large-cursor': false,
  'monaco-editor': false,
};
