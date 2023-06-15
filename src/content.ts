import { ReplitAccent, replitAccents, ReplitAccentVariations, replitAccentVariations, replitAccentVariationsBasic, ReplitAccentVariationsBasic } from "./types";

document.addEventListener('DOMContentLoaded', (e) => {
  console.debug('[XL] Reading SID from CRX storage');
  chrome.storage.local
    .get(['sid', 'activeSid', 'usernames', 'settings'])
    .then(({ sid: sids, usernames, activeSid, settings }) => {
      if (!activeSid) {
        activeSid = 0;
      }

      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('inject.js');
      s.dataset.sid = sids?.length ? `1${sids[activeSid]}` : '0,null';
      s.dataset.activeSid = activeSid.toString();
      s.dataset.usernames = usernames?.join(',') || '';
      s.dataset.settings = settings ? JSON.stringify(settings) : undefined;
      document.head.appendChild(s);
      console.debug('[XL] Injected script');
    });
});

window.addEventListener('load', (e) => {
  let userId = null;

  console.debug('[XL] Trying to get user ID from cookies');
  const cookieUserIdMatch = document.cookie.match(/ajs_user_id=(\d+)/);
  if (cookieUserIdMatch) {
    userId = cookieUserIdMatch[1];
    console.debug('[XL] Got Replit user ID by cookie:', userId);
  } else {
    console.warn('[XL] Could not get Replit user ID');
  }

  if (userId) {
    chrome.storage.local
      .set({
        userId,
      })
      .then(() => {
        console.debug('[XL] Saved user ID to local CRX storage');
      });
  }

  // Save theme values
  // TODO: make this an util func
  const themeContainerStyles = getComputedStyle(
    document.querySelector('.replit-ui-theme-root') ||
    document.documentElement
  );

  // TODO: move type to types file
  const themeValues: {
    accents: {
      [key in ReplitAccent]?: {
        [key in ReplitAccentVariationsBasic]?: string;
      };
    },
    backgrounds: {
      [key in ReplitAccentVariations]?: string;
    }
  } = {
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

  console.log('[XL] Got theme values:', themeValues);
});

window.addEventListener(
  'xl-replit-change-active-sid',
  (e: Event | CustomEvent<string>) => {
    if (!('detail' in e)) {
      return;
    }

    console.debug('[XL] Changing active SID to', e.detail);
    chrome.storage.local.get(['sid']).then(({ sid: sids }) => {
      chrome.storage.local
        .set({
          activeSid: e.detail,
        })
        .then(() => {
          chrome.runtime.sendMessage(
            {
              type: 'change-active-sid',
              value: sids[e.detail],
            },
            {},
            () => {
              window.location.reload();
            }
          );
        });
    });
  }
);
