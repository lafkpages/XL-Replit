import { getThemeGlobalValues } from './util/theme';

document.addEventListener('DOMContentLoaded', (e) => {
  console.debug('[XL] Reading SID from CRX storage');
  chrome.storage.local
    .get(['sid', 'activeSid', 'usernames', 'settings'])
    .then(({ sid: sids, usernames, activeSid, settings }) => {
      if (!activeSid) {
        activeSid = 0;
      }

      // Inject script (inject.ts)
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('inject.js');
      s.dataset.sid = sids?.length ? `1${sids[activeSid]}` : '0,null';
      s.dataset.activeSid = activeSid.toString();
      s.dataset.usernames = usernames?.join(',') || '';
      s.dataset.settings = settings ? JSON.stringify(settings) : undefined;
      document.head.appendChild(s);
      console.debug('[XL] Injected script');

      // Body classes
      if (settings['hide-bookish']) {
        document.body.dataset.xlReplitHideBookish = '1';
      }
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
  const themeValues = getThemeGlobalValues();
  chrome.storage.local.set({
    themeValues,
  });
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
