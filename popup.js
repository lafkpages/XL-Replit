const sidsCont = document.getElementById('sids');
const saveSidButton = document.getElementById('save-sid');
const delButton = document.getElementById('delete-sid');
const newSidButton = document.getElementById('new-sid');
const settingsCont = document.getElementById('settings');
const experimentsCont = document.getElementById('experiments-cont');

let userId = null;
let settings = {
  'show-advanced-settings': false,
  'account-switcher': false,
  'old-cover-page': false,
  'show-experiments': false,
  'nix-modules-tool': false,
  'extensions-beta': false,
  'ssh-tool': false,
  'auto-debug': false,
  'force-ssr': false,
  'block-graphql': false,
  'disable-github-import': false,
  'large-cursor': false,
};

// Some settings require optional permissions
const settingPermissions = {
  'account-switcher': ['cookies'],
};

// URL consts
const REPLIT_ORIGINS = [
  'https://replit.com',
  'https://firewalledreplit.com',
  'https://staging.replit.com',
];
const REPLIT_URLS = REPLIT_ORIGINS.map((url) => url + '/*');
const BACKEND = 'https://xl-replit-backend.luisafk.repl.co';

function parseSid(sid) {
  if (sid[1] != ':') {
    return decodeURIComponent(sid);
  }
  return sid;
}

function setSetting(key, val) {
  return new Promise((resolve, reject) => {
    settings[key] = val;

    chrome.storage.local
      .set({
        settings,
      })
      .then(() => {
        console.log('[XL] Saved settings');

        resolve();
      })
      .catch(reject);

    switch (key) {
      case 'show-advanced-settings': {
        settingsCont.dataset.advanced = +val;
        break;
      }

      case 'show-experiments': {
        experimentsCont.dataset.experiments = +val;
        break;
      }

      case 'block-graphql': {
        console.warn('Enabling/disabling GraphQL blocklist:', val);
        chrome.declarativeNetRequest.updateEnabledRulesets({
          [val ? 'enableRulesetIds' : 'disableRulesetIds']: ['block_gql'],
        });
        break;
      }
    }
  });
}

saveSidButton.addEventListener('click', (e) => {
  const sids = [...sidsCont.children].map((i) => parseSid(i.value));

  // check if the SIDs are correct
  fetch(`${BACKEND}/checkSid`, {
    method: 'POST',
    body: sids.join('\n'),
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then((resp) => {
    resp.text().then((results) => {
      const usernames = resp.headers.get('x-usernames').split(',');
      console.log('[XL] Got usernames:', usernames);
      console.log('[XL] SIDs valid:', results);

      for (let i = 0; i < results.length; i++) {
        sidsCont.children[i].dataset.valid = results[i];
        sidsCont.children[i].title = usernames[i];
      }

      chrome.storage.local
        .set({
          sid: sids,
          usernames,
        })
        .then(() => {
          console.log('[XL] Saved SIDs and usernames to local CRX storage');
        });
    });
  });
});

// delButton.addEventListener('click', (e) => {
//   chrome.storage.local
//     .set({
//       sid: '',
//     })
//     .then(() => {
//       console.log('[XL] Deleted SID from CRX storage');
//       window.location.reload();
//     });
// });

newSidButton.addEventListener('click', (e) => {
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'Enter your SID here...';
  sidsCont.appendChild(inp);
});

// get stored user ID, SID and settings
chrome.storage.local
  .get(['userId', 'sid', 'settings'])
  .then(({ userId: storedUserId, sid: sids, settings: storedSettings }) => {
    if (storedUserId) {
      // sidInput.disabled = false;
      saveSidButton.disabled = false;
      userId = storedUserId;
      console.debug('[XL] Got user ID from storage:', userId);
    }

    if (sids) {
      if (typeof sids == 'string') {
        sids = [sids];
      }

      console.debug('[XL] Got SIDs from storage');

      for (let i = 0; i < sids.length; i++) {
        let inp = sidsCont.children[i];

        if (!inp) {
          inp = document.createElement('input');
          inp.type = 'text';
          inp.placeholder = 'Enter your SID here...';
          sidsCont.appendChild(inp);
        }

        inp.value = sids[i];
      }
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
      const elm = document.querySelector(
        `div.settings-cont input[name="${key}"]`
      );

      if (!elm) {
        continue;
      }

      if (elm.type == 'checkbox') {
        elm.checked = val;
      } else {
        elm.value = val;
      }

      if (key == 'show-advanced-settings') {
        settingsCont.dataset.advanced = +val;
      } else if (key == 'show-experiments') {
        experimentsCont.dataset.experiments = +val;
      }
    }
  });

document.addEventListener('input', (e) => {
  if (!e.target.matches('div.settings-cont *')) {
    return;
  }

  console.debug('[XL] Settings changed');

  const key = e.target.name;
  const val = e.target.type == 'checkbox' ? e.target.checked : e.target.value;

  if (key in settingPermissions) {
    chrome.permissions
      .request({
        permissions: settingPermissions[key],
        origins: REPLIT_URLS,
      })
      .then((granted) => {
        if (granted) {
          setSetting(key, val);
        }
      });
  }

  setSetting(key, val);
});
