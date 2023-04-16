const sidInput = document.getElementById('sid-inp');
const sidButton = document.getElementById('save-sid');
const delButton = document.getElementById('delete-sid');
const settingsCont = document.getElementById('settings');

let userId = null;
let settings = {
  'old-cover-page': false,
  'nix-modules-tool': false,
  'extensions-beta': false,
  'ssh-tool': false,
  'auto-debug': false,
  'force-ssr': false,
};

// URL consts
const BACKEND = 'https://xl-replit-backend.luisafk.repl.co';

function parseSid(sid) {
  if (sid[1] != ':') {
    return decodeURIComponent(sid);
  }
  return sid;
}

sidButton.addEventListener('click', (e) => {
  const sid = parseSid(sidInput.value);

  // check if the SID is correct
  fetch(`${BACKEND}/checkSid`, {
    method: 'POST',
    body: sid,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
    .then((r) => r.text())
    .then((resp) => {
      const isValid = resp[0] == '1';

      console.log('[XL] SID valid:', isValid);

      sidInput.dataset.valid = isValid;

      if (isValid) {
        chrome.storage.local
          .set({
            sid,
          })
          .then(() => {
            console.log('[XL] Saved SID to local CRX storage');
          });
      }
    });
});

delButton.addEventListener('click', (e) => {
  chrome.storage.local
    .set({
      sid: '',
    })
    .then(() => {
      console.log('[XL] Deleted SID from CRX storage');
      window.location.reload();
    });
});

// get stored user ID, SID and settings
chrome.storage.local
  .get(['userId', 'sid', 'settings'])
  .then(({ userId: storedUserId, sid, settings: storedSettings }) => {
    if (storedUserId) {
      sidInput.disabled = false;
      sidButton.disabled = false;
      userId = storedUserId;
      console.debug('[XL] Got user ID from storage:', userId);
    }

    if (sid) {
      console.debug('[XL] Got SID from storage');
      sidInput.value = sid;
    }

    if (storedSettings) {
      settings = storedSettings;
      console.debug('[XL] Got settings from storage:', settings);
    } else {
      console.log('[XL] Found no stored settings, storing defaults');
      chrome.storage.local
        .set({
          settings,
        })
        .then(() => {
          console.log('[XL] Saved settings');
        });
    }

    for (const [key, val] of Object.entries(settings)) {
      const elm = document.querySelector(`#settings input[name="${key}"]`);

      if (!elm) {
        continue;
      }

      if (elm.type == 'checkbox') {
        elm.checked = val;
      } else {
        elm.value = val;
      }
    }
  });

settingsCont.addEventListener('input', (e) => {
  console.debug('[XL] Settings changed');

  const key = e.target.name;
  const val = e.target.type == 'checkbox' ? e.target.checked : e.target.value;

  settings[key] = val;

  chrome.storage.local
    .set({
      settings,
    })
    .then(() => {
      console.log('[XL] Saved settings');
    });
});
