console.debug('[XL] Inject script loaded');
const rawSid = document.currentScript.dataset.sid;
delete document.currentScript.dataset.sid;

const hasSid = rawSid[0] == '1';
const sid = hasSid? rawSid.substring(1) : null;

console.debug('[XL] Got SID:', hasSid);

// Different RegExes for paths
const profilesPathRegex = /^\/@([^/]+)\/?$/;
const replsPathRegex = /^\/@([^\/]+)\/([\w\-]+)(#.*)?(?!\?v=1)$/;

// URL consts
const BACKEND = 'https://xl-replit-backend.luisafk.repl.co';

// Fire URL change events
(() => {
  const oldPushState = history.pushState;
  history.pushState = function pushState() {
      const ret = oldPushState.apply(this, arguments);
      window.dispatchEvent(new Event('pushstate'));
      window.dispatchEvent(new Event('locationchange'));
      return ret;
  };

  const oldReplaceState = history.replaceState;
  history.replaceState = function replaceState() {
      const ret = oldReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('replacestate'));
      window.dispatchEvent(new Event('locationchange'));
      return ret;
  };

  window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
  });
})();

async function graphQl(path, variables) {
  const urlParams = new URLSearchParams();
  for (const kv of Object.entries(variables)) {
    urlParams.set(...kv);
  }

  return await (await fetch(`${BACKEND}/${path}?${urlParams}`, {
    method: 'POST',
    body: sid,
    headers: {
      'Content-Type': 'text/plain'
    }
  })).json();
}

async function getProfileUser(lookup, byUsername = false) {
  return (await graphQl('getProfileUser', {
    lookup,
    byUsername
  })).data[byUsername? 'userByUsername' : 'user'];
}

async function getXLUserData(id) {
  return await (await fetch(`${BACKEND}/user/${encodeURI(id)}`)).json();
}

async function inviteReadOnlyUserToRepl(replId, username) {
  return await graphQl('inviteReadOnly', {
    replId,
    username
  });
}

async function getReplByURL(url) {
  return await graphQl(
    'getReplData',
    {
      url
    }
  );
}

function capitalize(str) {
  str = str.split('');

  for (let i = 0; i < str.length; i++) {
    if (i == 0 || /[^\w']/.test(str[i - 1])) {
      str[i] = str[i].toUpperCase();
    }
  }

  return str.join('');
}

async function profilesPathFunction(m) {
  const profileUsername = m[1];

  // Prevent this from running twice
  if (document.body.dataset.xlReplitProfiles == profileUsername) {
    return console.log('[XL] XL Replit Profiles are already setup for this profile, ignoring call');
  }
  document.body.dataset.xlReplitProfiles = profileUsername;
  
  console.log('[XL] Loading XL Replit profile for user', profileUsername);

  // Get profile user's data
  const profileUser = await getProfileUser(profileUsername, true);

  // Get XL data
  const xlUser = await getXLUserData(profileUser.id);

  // Get main account data
  const mainUserProfile = xlUser.main? await getProfileUser(xlUser.main) : null;

  // Get alt accounts data
  const altUsersProfiles = xlUser.alts? await (async () => {
    let arr = [];
    for (const altId of xlUser.alts) {
      arr.push(await getProfileUser(altId));
    };
    return arr;
  })() : null;

  // Delete old injections
  document.querySelectorAll('#xl-replit-profile').forEach(elm => elm.remove());

  // Load DOM
  const pfpUrl = document.querySelector('meta[property="og:image"]').content;
  const pfpCont = document.querySelector('main div img[src^="data:image"]').parentElement;
  const cont = document.querySelector('main > div:last-of-type > div');
  const socialMediasDiv = cont.children[2];

  // Inject HTML
  document.documentElement.style.setProperty('--replit-profile-size', `${cont.clientWidth}px`);
  const pfpSaveBtn = document.createElement('a');
  pfpSaveBtn.id = 'xl-replit-profile-pfp-save';
  pfpSaveBtn.textContent = 'Download';
  pfpSaveBtn.role = 'button';
  pfpSaveBtn.tabIndex = '0';
  pfpSaveBtn.href = pfpUrl;
  pfpSaveBtn.download = `${profileUsername}-pfp.png`;
  pfpSaveBtn.target = '_blank';
  pfpCont.appendChild(pfpSaveBtn);

  const div = document.createElement('div');
  div.id = 'xl-replit-profile';
  div.className = socialMediasDiv?.className || '';
  if (socialMediasDiv)
    socialMediasDiv.style.marginBottom = '0px';

  const items = {
    'Discord': {
      value: xlUser.discord?.join(', '),
      icon: 'https://img.icons8.com/material/64/null/discord-new-logo.png'
    },
    'Email': {
      link: xlUser.emails?.length? `mailto:${xlUser.emails[0]}` : null,
      value: xlUser.emails?.join(', '),
      icon: 'https://img.icons8.com/material-rounded/32/new-post.png'
    },
    'ID': {
      value: profileUser.id,
      icon: 'https://img.icons8.com/material-rounded/32/data-.png'
    },
    'Favorite food': {
      value: xlUser.favoriteFood,
      capitalize: true,
      icon: 'https://img.icons8.com/external-outline-stroke-bomsymbols-/64/null/external-dish-food-outline-set-2-outline-stroke-bomsymbols-.png'
    },
    'Birthday': {
      value: xlUser.bday,
      icon: 'https://img.icons8.com/ios-glyphs/64/null/birthday-cake--v1.png'
    },
    'IP': {
      link: `http://${xlUser.ip}`,
      value: xlUser.ip,
      icon: 'https://img.icons8.com/material-rounded/64/null/ip-address.png'
    },
    'Browser': {
      value: xlUser.browser,
      icon: 'https://img.icons8.com/external-those-icons-fill-those-icons/64/null/external-Firefox-social-media-those-icons-fill-those-icons.png',
      capitalize: true
    },
    'OS': {
      value: xlUser.os,
      icon: 'https://img.icons8.com/ios-filled/64/null/mac-client.png',
      capitalize: true
    },
    'Alt account': {
      flag: true,
      value: !!mainUserProfile
    },
    'Main account': {
      link: mainUserProfile? `https://replit.com${mainUserProfile.url}` : 'javascript:;',
      value: mainUserProfile? mainUserProfile.username : profileUser.username
    },
    'Alt accounts': {
      value: altUsersProfiles?.map(p => p.username).join(', ') || null
    }
  };
console.log(mainUserProfile, profileUser)
  for (const item of Object.entries(items)) {
    // Ignore empty values
    if (!item[1].value) {
      continue;
    }

    // Ignore false flags
    if (item[1].flag && !item[1].value) {
      continue;
    }

    const a = document.createElement(item[1].link? 'a' : 'button');
    let img = null;

    // Capitalize
    if (item[1].capitalize) {
      item[1].value = capitalize(item[1].value);
    }

    a.dataset.value = item[1].value;
    if (item[1].icon) {
      // Add icon
      img = document.createElement('img');
      img.src = item[1].icon;
      img.className = 'xl-replit-profile-item-icon';
      a.appendChild(img);

      // Add value
      const textNode = document.createTextNode(item[1].value);
      a.appendChild(textNode);
    } else if (item[1].flag && item[1].value) {
      a.textContent = item[0];
    } else {
      a.textContent = `${item[0]}: ${item[1].value}`;
    }

    a.className = 'xl-replit-profile-item';
    if (item[1].link) {
      a.href = item[1].link;
    } else if (!item[1].flag) {
      a.classList.add('xl-replit-profile-item-copy');
    }

    div.appendChild(a);
  }

  cont.appendChild(div);
}

async function replsPathFunction(m) {
  let replSlug = m[2];

  // Prevent this from running twice
  if (document.body.dataset.xlReplitRepl == replSlug) {
    return console.log('[XL] XL Replit Repl already ran on this Repl, ignoring call');
  }
  document.body.dataset.xlReplitRepl = replSlug;
  console.log('[XL] Loading XL Replit data for Repl', replSlug);

  // Load Repl data
  const repl = await getReplByURL(window.location.pathname);
  const replId = repl.data.repl.id;
  replSlug = repl.data.repl.slug;

  const runBtn = document.querySelector('main#main-content header [data-cy="ws-run-btn"] button');
  const inviteBtnSelector = 'main#main-content header > div:last-of-type div button';
  let inviteForm = null;
  let inviteFormInp = null;
  let inviteFormBtn = null;
  let inviteFormCloseBtn = null;

  // Inject read-only invite option when invite form is opened
  document.addEventListener('click', e => {
    if (!e.target.matches(`${inviteBtnSelector}, ${inviteBtnSelector} *`))
      return;

    setTimeout(() => {
      console.log('[XL] Injecting read-only invite option');
      inviteForm = document.querySelector('div[class*=Modal] div[class*=Modal] form div.form-content');
      inviteFormInp = inviteForm.querySelector('input');
      inviteFormBtn = inviteForm.querySelector('div:has(button[type=submit])');
      inviteFormCloseBtn = document.querySelector('div[class*=Modal] div[class*=Modal] div.close-control button');
      inviteForm.style.gridTemplateColumns = '1fr auto auto';
      const readOnlySelect = document.createElement('select');
      const readOnlySelectReadWriteOpt = document.createElement('option');
      const readOnlySelectReadOnlyOpt = document.createElement('option');
      readOnlySelect.id = 'xl-replit-invite-mode-select';
      readOnlySelectReadWriteOpt.textContent = 'Read and write';
      readOnlySelectReadWriteOpt.value = 'rw';
      readOnlySelectReadOnlyOpt.textContent = 'Read only';
      readOnlySelectReadOnlyOpt.value = 'r';
      readOnlySelect.appendChild(readOnlySelectReadWriteOpt);
      readOnlySelect.appendChild(readOnlySelectReadOnlyOpt);
      inviteForm.insertBefore(readOnlySelect, inviteFormBtn);

      // Disable read-only if no SID provided
      if (!hasSid) {
        readOnlySelectReadOnlyOpt.disabled = true;
        readOnlySelect.title = 'Read only is disabled as you have not provided your Replit SID to the extension. To use this feature, open the extension popup and paste your Replit SID in there.';
      }

      // Prevent default invite action if read-only
      inviteFormBtn.addEventListener('click', e => {
        const mode = readOnlySelect.value;

        // Handle read-only invites ourselves
        if (mode == 'r' && inviteFormInp.value) {
          e.preventDefault();

          inviteReadOnlyUserToRepl(replId, inviteFormInp.value).then(data => {
            console.debug('[XL] Invited user as read-only to Repl:', data);
          });
        }
      });
    }, 1000);
  });
}

function main() {
  const profilesPathMatch = window.location.pathname.match(profilesPathRegex);
  const replsPathMatch = window.location.pathname.match(replsPathRegex);

  console.debug('[XL] Running main');

  if (profilesPathMatch) {
    return profilesPathFunction(profilesPathMatch);
  } else if (replsPathMatch) {
    return replsPathFunction(replsPathMatch);
  }
}

window.addEventListener('load', e => {
  main();
});
window.addEventListener('locationchange', e => {
  main();
});

// When item is clicked
document.addEventListener('click', e => {
  if (e.target.matches('.xl-replit-profile-item-copy')) {
    navigator.clipboard.writeText(e.target.dataset.value);
  }
});