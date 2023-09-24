import { applyOTs } from './util/ot';
import { api as replitProtocol } from '@replit/protocol';
import {
  BACKEND,
  TOSDR_SERVICE_ID,
  SET_FLAGS_HASH,
  REPLIT_GOVAL_URL_REGEX,
} from './consts';
import type { XLGovalChannel, XLSettings, UUID } from './types';
import type { ReplitCustomThemeValues } from './types';

module.exports = {
  production: PRODUCTION,
};

if (!(document.currentScript && 'src' in document.currentScript)) {
  throw new Error('Assertion failed');
}

console.debug('[XL] Inject script loaded', PRODUCTION ? '[PROD]' : '[DEV]');

// Get the selected SID passed from content script
const rawSid = document.currentScript.dataset.sid || '0';
delete document.currentScript.dataset.sid;

// Get the index of the active SID
const activeSid = parseInt(document.currentScript.dataset.activeSid!);
delete document.currentScript.dataset.activeSid;

// Get XL settings
const rawSettings = document.currentScript.dataset.settings;
const settings: XLSettings = rawSettings
  ? (() => {
      try {
        return JSON.parse(rawSettings);

        // TODO: validate settings
      } catch {
        return {};
      }
    })()
  : {};
delete document.currentScript.dataset.settings;
module.exports.settings = settings;

// Check for SID?
const hasSid = rawSid[0] == '1';
const sid = hasSid ? rawSid.substring(1) : null;

// Get usernames (same order as SIDs)
const usernames = document.currentScript.dataset
  .usernames!.split(',')
  .filter((u) => !!u);
delete document.currentScript.dataset.usernames;

// Current username
const username =
  document
    .getElementsByClassName('username')[0]
    ?.textContent?.replace(/^@/, '') ||
  globalThis.__NEXT_DATA__?.props?.apolloState?.CurrentUser?.username ||
  null;
module.exports.username = username;

// Current user ID
let userId =
  __NEXT_DATA__?.props.user?.id || __REPLIT__USER_FLAGS__?.userId || null;
module.exports.userId = userId;

console.debug('[XL] Got SID:', hasSid, '\n     Got usernames:', usernames);

const replUrlRegex = /^\/@(.+?)\/(.+?)(\?.*)?$/;

// Consts
const XL_REPLIT_EXTENSION_URL = new URL(document.currentScript.src).origin;

// URLs that don't use Next.js
const noNextUrls = /^\/(graphql|is_authenticated|\?(__cf))$/;

// Fire URL change events
(() => {
  const oldPushState = history.pushState;
  history.pushState = function pushState(state, unused, url?) {
    const ret = oldPushState.apply(this, [state, unused, url]);
    window.dispatchEvent(new Event('pushstate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };

  const oldReplaceState = history.replaceState;
  history.replaceState = function replaceState(state, unused, url?) {
    const ret = oldReplaceState.apply(this, [state, unused, url]);
    window.dispatchEvent(new Event('replacestate'));
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };

  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('locationchange'));
  });
})();

// Has loaded RequireJS
let hasLoadedRequireJS = false;

// Overwrite global WebSocket class
const _WebSocket = WebSocket;
let govalWebSocket: WebSocket | null = null;
let govalWebSocketOnMessage: ((e: MessageEvent) => void) | null = null;
let govalWebSocketConns = 0;
const govalWebSocketRefHandlers: {
  [ref: string]: (data: any) => void;
} = {};
WebSocket = class WebSocket extends _WebSocket {
  _isGovalWebSocket: boolean = false;

  constructor(url: string | URL, protocols: string | string[] = []) {
    super(url, protocols);

    if (!govalWebSocket && REPLIT_GOVAL_URL_REGEX.test(url.toString())) {
      govalWebSocketConns++;

      console.debug('[XL] Intercepted Replit Goval WebSocket');
      govalWebSocket = this;

      this._isGovalWebSocket = true;

      govalWebSocket.addEventListener('close', () => {
        govalWebSocket = null;
        govalWebSocketOnMessage = null;
      });
    }
  }

  set onmessage(v) {
    if (this._isGovalWebSocket) {
      if (v) {
        govalWebSocketOnMessage = v;
        super.onmessage = (e) => {
          if (replitProtocol) {
            const data = decodeGovalMessage(e.data);

            // Debug logs
            if (data?.ref?.startsWith('xlreplit')) {
              console.debug('[XL] Got Replit Goval message:', data);
            }

            if (govalWebSocketRefHandlers[data?.ref]) {
              govalWebSocketRefHandlers[data.ref](data);
              delete govalWebSocketRefHandlers[data.ref];
              return;
            }

            if (xlGovalChannels[data?.channel]) {
              if (xlGovalChannels[data.channel].handler instanceof Function) {
                xlGovalChannels[data.channel].handler!(data);
              }
              return;
            }
          }

          return govalWebSocket && govalWebSocketOnMessage
            ? govalWebSocketOnMessage.call(govalWebSocket, e)
            : null;
        };
      }
    } else {
      super.onmessage = v;
    }
  }

  get onmessage() {
    return super.onmessage;
  }
};

// Export Goval WebSocket
Object.defineProperties(module.exports, {
  govalWebSocket: {
    get() {
      return govalWebSocket;
    },
  },
  govalWebSocketConns: {
    get() {
      return govalWebSocketConns;
    },
  },
});

// XL Replit errors
class XLReplitError extends Error {
  data: any;

  constructor(message: string, data: any = null) {
    super(message);
    this.name = 'XLReplitError';

    if (data) {
      this.data = data;
    }
  }
}
module.exports.XLReplitError = XLReplitError;

// XL Replit Goval channels
let xlGovalChannels: {
  [channel: number]: XLGovalChannel;
} = {};

// XL Monaco Editors by IDs
const xlMonacoEditors: {
  [id: string]: {
    filePath: string;
    channelName?: string;
    channelId?: number;
    version?: number;
  };
} = {};

// Export Monaco Editors
Object.defineProperty(module.exports, 'monacoEditors', {
  get() {
    return xlMonacoEditors;
  },
});

// Function to get user's editor preferences
function getEditorPreferences() {
  return __NEXT_DATA__?.props.user?.editor_preferences;
}
module.exports.getEditorPreferences = getEditorPreferences;

async function graphQl(
  path: string,
  variables: {
    [key: string]: string;
  } = {}
) {
  const urlParams = new URLSearchParams();
  for (const [k, v] of Object.entries(variables)) {
    urlParams.set(k, v);
  }

  return await (
    await fetch(`${BACKEND}/${path}?${urlParams}`, {
      method: 'POST',
      body: sid,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  ).json();
}

async function getProfileUser(lookup: string, byUsername = false) {
  return (
    await graphQl('getProfileUser', {
      lookup,
      byUsername: byUsername.toString(),
    })
  ).data[byUsername ? 'userByUsername' : 'user'];
}

async function getXLUserData(id: string) {
  return await (await fetch(`${BACKEND}/user/${encodeURI(id)}`)).json();
}

async function inviteReadOnlyUserToRepl(replId: UUID, username: string) {
  return await graphQl('inviteReadOnly', {
    replId,
    username,
  });
}

async function getReplByURL(url: string) {
  return await graphQl('getReplData', {
    url,
  });
}

async function getReadOnlyReplByURL(url: string) {
  return await graphQl('getReplDataReadOnly', {
    url,
  });
}

async function tipCycles(
  amount: string | number,
  id: UUID | number,
  isTheme = false
) {
  const _id = id.toString();

  return await graphQl('tipCycles', {
    amount: amount.toString(),
    ...(isTheme
      ? {
          themeId: _id,
        }
      : { replId: _id }),
  });
}

function capitalize(str: string) {
  const arr = str.split('');

  for (let i = 0; i < str.length; i++) {
    if (i == 0 || /[^\w']/.test(str[i - 1])) {
      arr[i] = str[i].toUpperCase();
    }
  }

  return arr.join('');
}

// Replit flags exports
module.exports.flags = {};

function getFlags() {
  return (
    __REPLIT__USER_FLAGS__?.flags ||
    __NEXT_DATA__?.props.flagContext?.flags ||
    __NEXT_DATA__?.props.user?.gating ||
    []
  );
}
module.exports.flags.getAll = getFlags;

function getFlag(flag: string) {
  return getFlags().find((f) => f.controlName == flag);
}
module.exports.flags.get = getFlag;

function setFlag(flag: string, value: any) {
  const flagObj = getFlag(flag);

  if (flagObj) {
    flagObj.value = value;
    return true;
  }

  return false;
}
module.exports.flags.set = setFlag;

function getXlFlagsElm(): HTMLElement {
  return document.querySelector('div#__next > div') || document.body;
}

function xlFlagToDataset(flag: string) {
  return `xlReplit${flag[0].toUpperCase()}${flag.substring(1)}`;
}

function getXlFlag(flag: string) {
  return getXlFlagsElm().dataset[xlFlagToDataset(flag)];
}

function setXlFlag(flag: string, value: string) {
  getXlFlagsElm().dataset[xlFlagToDataset(flag)] = value;
}

function deleteXlFlag(flag: string) {
  delete getXlFlagsElm().dataset[xlFlagToDataset(flag)];
}

function loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function requirePromise(module: string[]) {
  return new Promise((resolve, reject) => {
    try {
      require(module, resolve);
    } catch (e) {
      reject(e);
    }
  });
}

function sendGovalMessage(
  channel: number,
  message: {},
  response = false
): Promise<replitProtocol.Command | null> {
  if (!(govalWebSocket instanceof WebSocket && replitProtocol)) {
    throw new XLReplitError('Assertion failed', {
      govalWebSocketInstanceOfWebSocket: govalWebSocket instanceof WebSocket,
      replitProtocol: !!replitProtocol,
    });
  }

  return new Promise((resolve, reject) => {
    if (govalWebSocket?.readyState == WebSocket.OPEN) {
      const ref =
        'xlreplit' + crypto.randomUUID().replace(/-/g, '').substring(0, 8);

      if (response) {
        govalWebSocketRefHandlers[ref] = (data) => {
          resolve(data);
        };
      }

      govalWebSocket.send(
        replitProtocol.Command.encode(
          replitProtocol.Command.create({
            channel,
            ref,
            ...message,
          })
        ).finish()
      );

      if (!response) {
        resolve(null);
      }
    } else {
      reject('Goval WebSocket not open');
    }
  });
}

function decodeGovalMessage(message: Uint8Array | ArrayBuffer) {
  if (message instanceof ArrayBuffer) {
    message = new Uint8Array(message);
  }

  if (!replitProtocol) {
    throw new XLReplitError('Assertion failed', {
      replitProtocol: !!replitProtocol,
    });
  }

  return replitProtocol.Command.decode(message as Uint8Array);
}

async function openGovalChannel(service: string, name = '', action = 0) {
  const res = await sendGovalMessage(
    0,
    {
      openChan: {
        service,
        name,
        action,
      },
    },
    true
  );

  if (!res) {
    throw new XLReplitError('No response', res);
  }

  if (!res?.openChanRes) {
    throw new XLReplitError('No open channel response', res);
  }

  if (res?.openChanRes?.error) {
    throw new XLReplitError(res.openChanRes.error, res);
  }

  if (!res?.openChanRes?.id) {
    throw new XLReplitError('Open channel response with no ID', res);
  }

  xlGovalChannels[res.openChanRes.id] = {
    openChanRes: res,
  };

  return res as replitProtocol.Command & {
    openChanRes: replitProtocol.OpenChannelRes;
  };
}
module.exports.openGovalChannel = openGovalChannel;

async function closeGovalChannel(id: number, action = 0) {
  const res = await sendGovalMessage(
    0,
    {
      closeChan: {
        id,
        action,
      },
    },
    true
  );

  if (!res?.closeChanRes) {
    throw new XLReplitError('No close channel response', res);
  }

  if ('error' in res?.closeChanRes) {
    throw new XLReplitError(res.closeChanRes.error as string, res);
  }

  delete xlGovalChannels[id];

  return res;
}
module.exports.closeGovalChannel = closeGovalChannel;

function injectCustomTips(replId: UUID | number, isTheme = false) {
  if (!settings['custom-tips']) {
    return false;
  }

  const tipsCont = document.querySelector('div#tips');

  const tipButtonsCont =
    tipsCont?.querySelector('div > div:nth-child(3)')?.parentElement || null;

  // If Repl can't be tipped
  if (!tipsCont || !tipButtonsCont || !tipButtonsCont.parentElement) {
    return false;
  }

  // Add classes for CSS
  tipButtonsCont.classList.add('xl-replit-tip-buttons-cont');
  tipButtonsCont.parentElement.children[1].classList.add(
    'xl-replit-tip-data-cont'
  );

  // Add custom tip button
  const customTipBtn = document.createElement('button');
  const customTipBtnEmoji = document.createElement('span');
  const customTipBtnText = document.createElement('span');
  customTipBtnEmoji.textContent = '\u{1F300}';
  customTipBtnText.textContent = 'Custom';
  customTipBtn.id = 'xl-replit-custom-tip-btn';
  customTipBtn.appendChild(customTipBtnEmoji);
  customTipBtn.appendChild(customTipBtnText);
  tipButtonsCont.appendChild(customTipBtn);

  // Add custom tip popup
  const customTipPopupCont = document.createElement('div');
  const customTipPopup = document.createElement('form');
  const customTipPopupTitle = document.createElement('h2');
  const customTipPopupInp = document.createElement('input');
  const customTipPopupBtnsCont = document.createElement('div');
  const customTipPopupCancel = document.createElement('button');
  const customTipPopupSubmit = document.createElement('button');
  customTipPopupCont.id = 'xl-replit-custom-tip-popup-cont';
  customTipPopup.id = 'xl-replit-custom-tip-popup';
  customTipPopupTitle.textContent = 'Custom Tip';
  customTipPopupInp.placeholder = 'Amount of cycles...';
  customTipPopupInp.type = 'number';
  customTipPopupInp.min = '10';
  // TODO: Implement tip splitting on server. See #43
  customTipPopupInp.max = '1000';
  customTipPopupInp.value = '10';
  customTipPopupInp.required = true;
  customTipPopupCancel.textContent = 'Cancel';
  customTipPopupCancel.type = 'button';
  customTipPopupSubmit.textContent = 'Tip!';
  customTipPopupSubmit.className = 'primary';
  customTipPopupSubmit.type = 'submit';
  customTipPopupBtnsCont.appendChild(customTipPopupCancel);
  customTipPopupBtnsCont.appendChild(customTipPopupSubmit);
  customTipPopup.appendChild(customTipPopupTitle);
  customTipPopup.appendChild(customTipPopupInp);
  customTipPopup.appendChild(customTipPopupBtnsCont);
  customTipPopupCont.appendChild(customTipPopup);
  document.body.appendChild(customTipPopupCont);

  // When custom tip is clicked
  customTipBtn.addEventListener('click', (e) => {
    // Show custom tip popup
    customTipPopupCont.classList.add('show');
  });

  // When cancel button is clicked
  customTipPopupCancel.addEventListener('click', (e) => {
    // Close the popup
    customTipPopupCont.classList.remove('show');
  });

  // When the tip button is clicked
  customTipPopup.addEventListener('submit', (e) => {
    e.preventDefault();

    // Disable buttons
    customTipPopupCancel.disabled = true;
    customTipPopupSubmit.disabled = true;

    // Send tip
    tipCycles(customTipPopupInp.valueAsNumber, replId, isTheme).then(
      (result) => {
        // Enable buttons
        customTipPopupCancel.disabled = false;
        customTipPopupSubmit.disabled = false;

        // Hide popup
        customTipPopupCont.classList.remove('show');

        // Reload to update tip data
        next?.router.reload();
      }
    );
  });

  return true;
}

function switchAccount(sidIndex: number) {
  return window.dispatchEvent(
    new CustomEvent('xl-replit-change-active-sid', {
      detail: sidIndex,
    })
  );
}
module.exports.switchAccount = switchAccount;

function injectAccountSwitcher() {
  if (getXlFlag('accountSwitcher')) {
    return true;
  }

  if (!settings['account-switcher']) {
    return false;
  }

  setXlFlag('accountSwitcher', '1');
  const themeSwitcherCont = document.querySelector(
    'div:has(> :nth-child(2)) > :has(> div[data-cy="preferences-theme-dropdown"])'
  )?.parentElement;

  // TODO: Firefox doesn't support :has() yet

  if (themeSwitcherCont) {
    // Build account switcher
    const accountSwitcherIcon = document
      .querySelector('ul li a[href^="/teams"] svg')
      ?.cloneNode(true) as SVGElement | undefined;

    if (!accountSwitcherIcon) {
      return false;
    }

    const themeSwitcher = themeSwitcherCont.children[0];
    const themeSwitcherBtnCont = themeSwitcher.children[0];
    const themeSwitcherBtn = themeSwitcherBtnCont.querySelector('button')!;
    const accountSwitcherCont = document.createElement('div');
    accountSwitcherCont.className = themeSwitcher.className;
    accountSwitcherCont.id = 'xl-replit-account-switcher-cont';
    const accountSwitcherBtnCont = document.createElement('div');
    accountSwitcherBtnCont.className = themeSwitcherBtnCont.className;
    accountSwitcherIcon.id = 'xl-replit-account-switcher-icon';
    const accountSwitcherBtn = document.createElement('select');
    accountSwitcherBtn.className = themeSwitcherBtn.className;
    accountSwitcherBtn.id = 'xl-replit-account-switcher';
    if (!usernames.length) {
      accountSwitcherBtn.disabled = true;
    }
    const accountSwitcherUsernames = usernames.length ? usernames : [username];
    for (let i = 0; i < accountSwitcherUsernames.length; i++) {
      const accountOpt = document.createElement('option');
      accountOpt.textContent = accountSwitcherUsernames[i];
      accountOpt.value = i.toString();
      accountOpt.selected = i == activeSid;
      accountSwitcherBtn.appendChild(accountOpt);
    }
    const accountSwitcherArrow = themeSwitcherBtnCont
      .querySelector('svg:nth-of-type(2)')
      ?.cloneNode(true) as SVGElement | undefined;
    accountSwitcherBtnCont.appendChild(accountSwitcherIcon);
    accountSwitcherBtnCont.appendChild(accountSwitcherBtn);
    if (accountSwitcherArrow) {
      accountSwitcherArrow.id = 'xl-replit-account-switcher-arrow';
      accountSwitcherBtnCont.appendChild(accountSwitcherArrow);
    }
    accountSwitcherCont.appendChild(accountSwitcherBtnCont);
    themeSwitcherCont.insertBefore(
      accountSwitcherCont,
      themeSwitcher.nextSibling
    );
    accountSwitcherBtn.addEventListener('input', () => {
      switchAccount(parseInt(accountSwitcherBtn.value));
    });
    return true;
  } else {
    deleteXlFlag('accountSwitcher');
    return false;
  }
}

async function injectMonacoEditors() {
  if (!settings['monaco-editor']) {
    return false;
  }

  if (typeof monaco == 'undefined') {
    throw new Error('Monaco is not defined');
  }

  registerMonacoReplitTheme();

  const cmEditors = document.getElementsByClassName(
    'cm-editor'
  ) as HTMLCollectionOf<HTMLDivElement>;

  for (const cmEditor of Array.from(cmEditors)) {
    // Ignore if already injected
    if (cmEditor.dataset.xlMonacoInjected) {
      continue;
    }

    if (!cmEditor.parentElement?.parentElement) {
      continue;
    }

    // Get file path
    const filePath =
      cmEditor.parentElement.parentElement.dataset.cy?.match(
        /^workspace-cm-editor-(.+)$/i
      )?.[1] || null;

    // If no file path, ignore
    if (!filePath) {
      continue;
    }

    // If file is loading, wait for it to load
    if (filePath == 'loading') {
      if (cmEditor.dataset.xlMonacoObserved) {
        continue;
      }

      console.debug('[XL] Waiting for CodeMirror pane to load');

      const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type == 'attributes' &&
            mutation.attributeName == 'data-cy' &&
            mutation.target instanceof HTMLElement &&
            mutation.target.dataset.cy != 'workspace-cm-editor-loading'
          ) {
            injectMonacoEditors();
            mutationObserver.disconnect();
            delete cmEditor.dataset.xlMonacoObserved;
            return;
          }
        }
      });
      mutationObserver.observe(cmEditor.parentElement.parentElement, {
        attributes: true,
        attributeFilter: ['data-cy'],
      });

      // Prevent more observers from being created
      cmEditor.dataset.xlMonacoObserved = '1';

      continue;
    }

    // If editor already exists
    for (const editor of monaco.editor.getEditors()) {
      const editorId = editor.getId();

      // Dispose old duplicate editors
      if (xlMonacoEditors[editorId].filePath == filePath) {
        console.debug(
          `[XL] Disposing old duplicate Monaco editor for ${filePath}`
        );

        editor.getModel().dispose();
        editor.dispose();

        if (xlMonacoEditors[editorId].channelId) {
          await closeGovalChannel(xlMonacoEditors[editorId].channelId!);
        }

        delete xlMonacoEditors[editorId];
        break;
      }
    }

    // Editor value
    const value = `Loading ${filePath} ...`;

    // Monaco model
    let monacoModel = null;
    try {
      monacoModel = monaco.editor.createModel(
        value,
        undefined,
        monaco.Uri.file(filePath)
      );
    } catch (e) {
      console.warn(`[XL] Failed to create Monaco model for ${filePath}:`, e);
      continue;
    }

    // Remove CodeMirror editor
    cmEditor.textContent = '';

    // Inject Monaco editor
    const monacoEditor = monaco.editor.create(cmEditor, {
      value,
      automaticLayout: true,
    });
    monacoEditor.setModel(monacoModel);

    // Monaco Editor ID
    const editorId = monacoEditor.getId();

    // Goval channel name
    const channelName = `ot-xl:${filePath}`;

    // Save editor file path
    xlMonacoEditors[editorId] = { filePath, channelName };

    // Is .setValue() being called?
    let isSetValue = false;

    // Flush OTs timeout
    let flushOtsTimeout: ReturnType<typeof setTimeout> | null = null;

    // Create OT channel
    const openOtChan = await openGovalChannel('ot', channelName, 2);
    xlMonacoEditors[editorId].channelId = openOtChan.openChanRes.id;

    // Link file
    const linkFileRes = await sendGovalMessage(
      openOtChan.openChanRes.id,
      {
        otLinkFile: {
          file: {
            path: filePath,
          },
        },
      },
      true
    );

    if (!linkFileRes) {
      throw new XLReplitError('Failed to link file', editorId);
    }

    const contentsBin =
      linkFileRes?.otLinkFileResponse?.linkedFile?.content || null;
    const contentsStr = contentsBin
      ? new TextDecoder('utf-8').decode(contentsBin)
      : null;

    if (contentsBin) {
      isSetValue = true;
      monacoEditor.setValue(contentsStr);
      isSetValue = false;
    }

    if (typeof linkFileRes?.otLinkFileResponse?.version == 'number') {
      xlMonacoEditors[editorId].version =
        linkFileRes.otLinkFileResponse.version;
    }

    // Listen to channel messages
    xlGovalChannels[openOtChan.openChanRes.id].handler = (msg) => {
      console.debug('[XL] OT message received', msg);

      if (msg?.otstatus?.contents) {
        // monacoEditor.setValue(msg.otstatus.contents);
      }

      if (msg?.ot) {
        if (msg.ot.version) {
          xlMonacoEditors[editorId].version = msg.ot.version;
        }

        if (msg.ot.op instanceof Array) {
          if (msg.ot.userId != userId) {
            const { file: newVal } = applyOTs(
              monacoEditor.getValue(),
              msg.ot.op
            );

            isSetValue = true;
            monacoEditor.setValue(newVal);
            isSetValue = false;
          }
        }
      }
    };

    // On change
    monacoEditor.onDidChangeModelContent(async (e: any) => {
      // TODO: fix e type
      if (isSetValue) {
        return;
      }

      console.debug('[XL] Monaco editor changed', e);

      const ots = [];

      let cursor = 0;

      // Generate OTs from changes
      for (const change of e.changes) {
        if (change.rangeOffset != cursor) {
          ots.push({
            skip: change.rangeOffset - cursor,
          });
        }

        if (change.rangeLength) {
          ots.push({
            delete: change.rangeLength,
          });
        }

        if (change.text) {
          ots.push({
            insert: change.text,
          });
        }
      }

      console.debug('[XL] Monaco editor OTs:', ots);

      // Send OTs
      const sendOtRes = await sendGovalMessage(
        // TODO: Debounce Monaco onChange
        xlMonacoEditors[editorId].channelId!,
        {
          ot: {
            spookyVersion: xlMonacoEditors[editorId].version,
            op: ots,
          },
        },
        true
      );

      console.debug('[XL] Send OTs:', sendOtRes);

      // Flush OTs
      if (flushOtsTimeout) {
        clearTimeout(flushOtsTimeout);
      }
      flushOtsTimeout = setTimeout(() => {
        console.debug('[XL] Flushing OTs');
        sendGovalMessage(xlMonacoEditors[editorId].channelId!, {
          flush: {},
        });
      }, 1000);
    });

    // Add attribute to skip this in the future
    cmEditor.dataset.xlMonacoInjected = '1';
    cmEditor.dataset.xlMonacoId = editorId;
  }

  // When WS disconnects, kill all editors
  govalWebSocket?.addEventListener('close', () => {
    const cmEditors = document.getElementsByClassName(
      'cm-editor'
    ) as HTMLCollectionOf<HTMLDivElement>;

    for (const cmEditor of Array.from(cmEditors)) {
      delete cmEditor.dataset.xlMonacoInjected;
    }

    for (const editor of monaco?.editor.getEditors()) {
      const editorId = editor.getId();

      // Dispose Monaco editor and model
      editor.getModel().dispose();
      editor.dispose();
    }
  });
}
module.exports.injectMonacoEditors = injectMonacoEditors;

function registerMonacoReplitTheme() {
  if (typeof monaco == 'undefined') {
    throw new Error('Monaco is not defined');
  }

  if (getXlFlag('monacoThemeRegistered')) {
    return;
  }

  const themeValues = findApolloState('ThemeVersion') as {
    values?: ReplitCustomThemeValues;
  } | null;

  const base = getCurrentThemeType() == 'light' ? 'vs' : 'vs-dark';

  if (themeValues?.values) {
    const rules = themeValues.values.editor.syntaxHighlighting.map((rule) => ({
      token: rule.tags![0].name,
      ...Object.fromEntries(
        Object.entries(rule.values!).map(([k, v]) => {
          k =
            {
              color: 'foreground',
            }[k] || k;

          v = cssVarToValue(v as string) || v;

          if (k.endsWith('ground') && k.length == 10) {
            if ((v as string)[0] == '#') {
              v = (v as string).substring(1);
            }
          }

          return [k, v];
        })
      ),
    }));

    monaco.editor.defineTheme('replit', {
      base,
      rules,
      colors: {
        // text foreground
        'editor.foreground': themeValues.values.global.foregroundDefault,

        // text background
        'editor.background': themeValues.values.global.backgroundDefault,

        // text selection background
        // add 55 at the end for transparency
        'editor.selectionBackground': `${themeValues.values.global.accentPrimaryDefault}55`,
      },
    });

    monaco.editor.setTheme('replit');
  } else {
    monaco.editor.setTheme(base);
  }

  setXlFlag('monacoThemeRegistered', '1');
}

function cssVarToValue(css: string, elm: Element | null = null) {
  const m = css.trim().match(/^var\((.+?)\)$/);

  if (!m) {
    return null;
  }

  if (!elm) {
    elm = document.body || document.documentElement;
  }

  return getComputedStyle(elm).getPropertyValue(m[1]).trim();
}

function getCurrentThemeType(): 'light' | 'dark' | null {
  const customTheme = findApolloState('CustomTheme');

  if (customTheme) {
    return customTheme.colorScheme;
  }

  const backgroundRoot = parseInt(
    getComputedStyle(document.body)
      .getPropertyValue('--background-root')
      .substring(1),
    16
  );

  if (typeof backgroundRoot != 'number' || isNaN(backgroundRoot)) {
    return null;
  }

  const threshold = 0xffffff / 2;

  if (backgroundRoot > threshold) {
    return 'light';
  }

  return 'dark';
}

function findApolloState(query: string | ((key: string) => boolean)) {
  if (!__NEXT_DATA__?.props?.apolloState) {
    return null;
  }

  if (typeof query == 'string') {
    const origQuery = query;
    query = (key) => {
      return key.startsWith(origQuery);
    };
  }

  for (const [key, value] of Object.entries(__NEXT_DATA__.props.apolloState)) {
    if (query(key)) {
      return value;
    }
  }

  return null;
}
module.exports.findApolloState = findApolloState;

async function profilesPathFunction() {
  const profileUsername = next?.router?.query?.username as string;

  // Prevent this from running twice
  const xlReplitPage = `profiles/${profileUsername}`;
  if (getXlFlag('page') == xlReplitPage) {
    return console.log(
      '[XL] XL Replit Profiles are already setup for this profile, ignoring call'
    );
  }
  setXlFlag('page', xlReplitPage);

  console.log('[XL] Loading XL Replit profile for user', profileUsername);

  // Get profile user's data
  const profileUser = await getProfileUser(profileUsername, true);

  // Get XL data
  const xlUser = await getXLUserData(profileUser.id);

  // Get main account data
  const mainUserProfile = xlUser.main
    ? xlUser.main == profileUser.id
      ? profileUser
      : await getProfileUser(xlUser.main)
    : null;

  // Get alt accounts data
  const altUsersProfiles = xlUser.alts
    ? await (async () => {
        let arr = [];
        for (const altId of xlUser.alts) {
          arr.push(await getProfileUser(altId));
        }
        return arr;
      })()
    : null;

  // Make sure user didn't navigate elsewhere while loading data
  if (next?.router?.route != '/profile') {
    return;
  }

  // Delete old injections
  document
    .querySelectorAll('#xl-replit-profile')
    .forEach((elm) => elm.remove());

  // Load DOM
  const pfpUrl = (
    document.querySelector('meta[property="og:image"]') as HTMLMetaElement
  ).content;
  const pfpCont =
    document.querySelector('main div img[src^="data:image"]')?.parentElement ||
    null;

  if (!pfpCont) {
    console.warn(
      '[XL] Could not find profile picture container, aborting XL Replit Profiles'
    );
    return;
  }

  const cont = document.querySelector(
    'main > div:last-of-type > div'
  ) as HTMLDivElement;
  const socialMediasDiv = cont.children[2] as HTMLElement;

  // Inject HTML
  document.documentElement.style.setProperty(
    '--replit-profile-size',
    `${cont.clientWidth}px`
  );
  const pfpSaveBtn = document.createElement('a');
  pfpSaveBtn.id = 'xl-replit-profile-pfp-save';
  pfpSaveBtn.textContent = 'Download';
  pfpSaveBtn.role = 'button';
  pfpSaveBtn.tabIndex = 0;
  pfpSaveBtn.href = pfpUrl;
  pfpSaveBtn.download = `${profileUsername}-pfp.png`;
  pfpSaveBtn.target = '_blank';
  pfpCont.appendChild(pfpSaveBtn);

  const div = document.createElement('div');
  div.id = 'xl-replit-profile';
  div.className = socialMediasDiv?.className || '';
  if (socialMediasDiv) socialMediasDiv.style.marginBottom = '0px';

  const items: {
    [key: string]: {
      link?: string | null;
      value?: string | boolean | null;
      icon?: string;
      capitalize?: boolean;
      flag?: boolean;
    };
  } = {
    Discord: {
      value: xlUser.discord?.join(', '),
      icon: 'discord.png',
    },
    Email: {
      link: xlUser.emails?.length ? `mailto:${xlUser.emails[0]}` : null,
      value: xlUser.emails?.join(', '),
      icon: 'email.png',
    },
    ID: {
      value: profileUser.id,
      icon: 'id.png',
    },
    'Favorite food': {
      value: xlUser.favoriteFood,
      capitalize: true,
      icon: 'favoriteFood.png',
    },
    Birthday: {
      value: xlUser.bday,
      icon: 'cake.png',
    },
    IP: {
      link: `http://${xlUser.ip}`,
      value: xlUser.ip,
      icon: 'ip.png',
    },
    Browser: {
      value: xlUser.browser,
      icon: 'firefox.png',
      capitalize: true,
    },
    OS: {
      value: xlUser.os,
      icon: 'macos.png',
      capitalize: true,
    },
    'Alt account': {
      flag: true,
      value: !!mainUserProfile,
    },
    'Main account': {
      link: mainUserProfile
        ? `https://replit.com${mainUserProfile.url}`
        : 'javascript:;',
      value: mainUserProfile ? mainUserProfile.username : profileUser.username,
    },
    'Alt accounts': {
      value: altUsersProfiles?.map((p) => p.username).join(', ') || null,
    },
  };

  for (const item of Object.entries(items)) {
    // Ignore empty values
    if (!item[1].value) {
      continue;
    }

    // Ignore false flags
    if (item[1].flag && !item[1].value) {
      continue;
    }

    const a = document.createElement(item[1].link ? 'a' : 'button');
    let img = null;

    // Capitalize
    if (item[1].capitalize && typeof item[1].value == 'string') {
      item[1].value = capitalize(item[1].value);
    }

    a.dataset.value = item[1].value.toString();
    if (item[1].icon) {
      // Add icon
      img = document.createElement('img');
      img.src = `${XL_REPLIT_EXTENSION_URL}/public/assets/${item[1].icon}`;
      img.className = 'xl-replit-profile-item-icon';
      a.appendChild(img);

      // Add value
      const textNode = document.createTextNode(item[1].value.toString());
      a.appendChild(textNode);
    } else if (item[1].flag && item[1].value) {
      a.textContent = item[0];
    } else {
      a.textContent = `${item[0]}: ${item[1].value}`;
    }

    a.className = 'xl-replit-profile-item';
    if (item[1].link && a instanceof HTMLAnchorElement) {
      a.href = item[1].link;
    } else if (!item[1].flag) {
      a.classList.add('xl-replit-profile-item-copy');
    }

    div.appendChild(a);
  }

  cont.appendChild(div);
}

async function replsPathFunction() {
  const m =
    (next?.router?.state?.query?.replUrl as string | undefined)?.match(
      replUrlRegex
    ) || null;
  let replSlug = m?.[2] || null;

  // Prevent this from running twice
  const xlReplitPage = `repls/${replSlug}`;
  if (getXlFlag('page') == xlReplitPage) {
    return console.log(
      '[XL] XL Replit Repl already ran on this Repl, ignoring call'
    );
  }
  setXlFlag('page', xlReplitPage);
  console.log('[XL] Loading XL Replit data for Repl', replSlug);

  // Enable debug
  if (settings['auto-debug'] && next?.router?.query) {
    next.router.query.debug = true;
  }

  // Large cursor
  if (settings['large-cursor']) {
    setXlFlag('largeCursor', '1');
  }

  // Load libs
  require.config({
    paths: {
      vs: `${XL_REPLIT_EXTENSION_URL}/public/vs`,
    },
  });

  // Layout container
  const layoutContainer = document.querySelector('main header ~ div');

  // Monaco Editor
  if (settings['monaco-editor']) {
    console.debug('[XL] Loading Monaco Editor');
    await requirePromise(['vs/editor/editor.main']);
    console.debug('[XL] Monaco Editor loaded');

    injectMonacoEditors();

    // Dispose editors when a pane is closed
    if (layoutContainer) {
      const mutationObserver = new MutationObserver(async (mutations) => {
        let shouldCheckUnusedEditors = false;

        for (const mutation of mutations) {
          if (mutation.removedNodes.length) {
            shouldCheckUnusedEditors = true;
            break;
          }
        }

        if (shouldCheckUnusedEditors) {
          for (const editor of monaco?.editor.getEditors()) {
            const editorId = editor.getId();

            // Search for the editor ID in the DOM
            const editorElm =
              layoutContainer.querySelector(
                `[data-xl-monaco-id="${editorId}"] .monaco-editor`
              ) || null;

            if (!editorElm) {
              console.debug(
                `[XL] Disposing unused Monaco Editor for file`,
                xlMonacoEditors[editorId].filePath
              );

              // Dispose editor and model
              editor.getModel().dispose();
              editor.dispose();

              // Close Goval channel
              if (xlMonacoEditors[editorId].channelId) {
                await closeGovalChannel(xlMonacoEditors[editorId].channelId!);
              }

              // Delete editor from list
              delete xlMonacoEditors[editorId];
            }
          }
        }
      });
      mutationObserver.observe(layoutContainer, {
        childList: true,
      });
    }
  }

  // Load Repl data
  const repl = await getReplByURL(window.location.pathname);
  const replId: UUID = repl.data.repl.id;
  replSlug = repl.data.repl.slug;

  const runBtn = document.querySelector(
    'main#main-content header [data-cy="ws-run-btn"] button'
  );
  const inviteBtnSelector =
    'main#main-content header > div:last-of-type div button';
  let inviteForm: HTMLFormElement | null = null;
  let inviteFormInp: HTMLInputElement | null = null;
  let inviteFormBtn: HTMLDivElement | null = null;
  let inviteFormCloseBtn: HTMLButtonElement | null = null;

  // Tools container
  const toolsCont =
    document.querySelector('div[role=toolbar] button[draggable]')
      ?.parentElement || null;

  // Use parentElement to avoid using :has()
  // for compatibility with older browsers

  if (toolsCont) {
    toolsCont.addEventListener(
      'click',
      (
        e: MouseEvent & {
          target?: EventTarget | HTMLElement | null;
        }
      ) => {
        console.log(e.target);
        if (!(e.target instanceof HTMLElement)) {
          return;
        }

        if (e.target?.tagName == 'BUTTON') {
          const toolName = e.target.textContent?.trim();

          if (toolName) {
            console.debug('[XL] Clicked on tool:', toolName);
          }
        }
      }
    );
  } else {
    console.warn('[XL] Could not find tools container');
  }

  document.addEventListener(
    'click',
    (
      e: MouseEvent & {
        target?: EventTarget | HTMLElement | null;
      }
    ) => {
      // Reinject Monaco editors, Justin Case
      injectMonacoEditors();

      // Inject read-only invite option when invite form is opened
      if (!(e.target && 'matches' in e.target)) return;
      if (!e.target.matches(`${inviteBtnSelector}, ${inviteBtnSelector} *`))
        return;

      setTimeout(() => {
        console.log('[XL] Injecting read-only invite option');

        inviteForm = document.querySelector('form');

        if (!inviteForm) {
          return;
        }

        inviteFormInp = inviteForm.querySelector('input') || null;

        inviteFormBtn =
          (inviteForm.querySelector('div > button[type=submit]')
            ?.parentElement as HTMLDivElement | null) || null;

        inviteFormCloseBtn = document.querySelector(
          'div[class*=Modal] div[class*=Modal] div.close-control button'
        );

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
          readOnlySelect.title =
            'Read only is disabled as you have not provided your Replit SID to the extension. To use this feature, open the extension popup and paste your Replit SID in there.';
        }

        // Prevent default invite action if read-only
        inviteFormBtn?.addEventListener('click', (e) => {
          const mode = readOnlySelect.value;

          // Handle read-only invites ourselves
          if (mode == 'r' && inviteFormInp?.value) {
            e.preventDefault();

            inviteReadOnlyUserToRepl(replId, inviteFormInp.value).then(
              (data) => {
                console.debug('[XL] Invited user as read-only to Repl:', data);
              }
            );
          }
        });
      }, 1000);
    }
  );

  injectMonacoEditors();
}

async function replSpotlightPathFunction() {
  const m = (next?.router?.state?.query?.replUrl as string).match(replUrlRegex);

  if (!m) {
    return;
  }

  let replSlug = m[2];

  // Prevent this from running twice
  const xlReplitPage = `replSpotlight/${replSlug}`;
  if (getXlFlag('page') == xlReplitPage) {
    return console.log(
      '[XL] XL Replit Repl Spotlight already ran on this Repl, ignoring call'
    );
  }
  setXlFlag('page', xlReplitPage);

  // Load read-only Repl data
  const repl = (await getReadOnlyReplByURL(m[0])).data.repl;
  replSlug = repl.slug;

  injectCustomTips(repl.id);
}

async function themePathFunction() {
  const themeId = next?.router?.query?.themeId as number;

  // Prevent this from running twice
  const xlReplitPage = `theme/${themeId}`;
  if (getXlFlag('page') == xlReplitPage) {
    return console.log(
      '[XL] XL Replit theme already ran on this Repl, ignoring call'
    );
  }
  setXlFlag('page', xlReplitPage);

  injectCustomTips(themeId, true);
}

async function termsPathFunction() {
  // Prevent this from running twice
  const xlReplitPage = 'terms';
  if (getXlFlag('page') == xlReplitPage) {
    return console.log(
      '[XL] XL Replit Terms of Service already ran, ignoring call'
    );
  }
  setXlFlag('page', xlReplitPage);

  // Get main content container
  const cont = document.querySelector('main .content');

  if (!cont) {
    return;
  }

  // Inject ToS;DR badge
  const tosdrBadgeImg = new Image();
  tosdrBadgeImg.src = `https://shields.tosdr.org/${TOSDR_SERVICE_ID}.svg`;
  tosdrBadgeImg.alt = "Terms of Service; Didn't Read";
  tosdrBadgeImg.title = "Terms of Service; Didn't Read";

  const tosdrBadgeLink = document.createElement('a');
  tosdrBadgeLink.href = `https://tosdr.org/en/service/${TOSDR_SERVICE_ID}`;
  tosdrBadgeLink.target = '_blank';
  tosdrBadgeLink.rel = 'noopener noreferrer';
  tosdrBadgeLink.id = 'xl-tosdr-badge';
  tosdrBadgeLink.appendChild(tosdrBadgeImg);

  cont.prepend(tosdrBadgeLink);
}

async function main() {
  const path =
    window.location.pathname + window.location.search + window.location.hash;

  console.debug('[XL] Running main');

  // Get current user ID
  userId = findApolloState('CurrentUser')?.id || userId;
  module.exports.userId = userId;

  // Load RequireJS
  if (!hasLoadedRequireJS) {
    await loadScript(`${XL_REPLIT_EXTENSION_URL}/public/require.js`);
    hasLoadedRequireJS = true;
  }

  // Inject account switcher
  injectAccountSwitcher();

  switch (next?.router?.route) {
    case '/profile':
      return profilesPathFunction();

    case '/replEnvironmentDesktop':
      return replsPathFunction();

    case '/replView':
      return replSpotlightPathFunction();

    case '/themes/theme':
      return themePathFunction();

    case '/terms':
    case '/site/terms':
      return termsPathFunction();
  }
}

window.addEventListener('load', (e) => {
  console.debug('[XL] Load fired');
  main();
});
window.addEventListener('locationchange', (e) => {
  console.debug('[XL] LocationChange fired');
  main();
});

// When item is clicked
document.addEventListener(
  'click',
  (
    e: MouseEvent & {
      target?: EventTarget | HTMLElement | null;
    }
  ) => {
    if (e.target && 'classList' in e.target) {
      if (
        e.target.classList.contains('xl-replit-profile-item-copy') &&
        e.target.dataset.value
      ) {
        navigator.clipboard.writeText(e.target.dataset.value);
      }
    }
  }
);

// Modify flags
(async () => {
  // If no Next, ignore
  if (noNextUrls.test(window.location.pathname + window.location.search)) {
    console.debug("[XL] This page doesn't use Next");
    return;
  }

  // Wait for Next to load
  while (!('next' in globalThis)) {}

  // Set flags
  next!.router.push(`#${SET_FLAGS_HASH}`);
  if (settings['old-cover-page']) {
    setFlag('flag-new-cover-page', false);
  }
  if (settings['nix-modules-tool']) {
    setFlag('flag-nix-modules-tool', true);
  }
  if (settings['extensions-beta']) {
    setFlag('flag-extensions', true);
    setFlag('flag-extension-creator', true);
    setFlag('flag-iframe-extensions', true);
    setFlag('flag-user-extensions', true);

    // Note that this no longer works. To use
    // extension DevTools, use the .replit file
    setFlag('flag-extension-devtools', true);
  }
  if (settings['ssh-tool']) {
    setFlag('flag-series-of-tubes', true);
  }
  if (settings['disable-github-import']) {
    setFlag('flag-disable-github-import', true);
  }
  next!.router.back();

  // Listen for location changes
  // TODO: handle client-side router onLoad
  const nextRouterPush = next!.router.push;
  next!.router.push = function () {
    const realUrlToNavigate =
      arguments[arguments.length - 1]?.pathname || arguments[1] || null;

    // TODO: don't use last argument, find argument index

    console.debug(
      '[XL] Intercepted Next Router push:',
      this.state,
      realUrlToNavigate
    );

    if (settings['force-ssr']) {
      window.location.assign(realUrlToNavigate);
      return {};
    } else {
      const val = nextRouterPush.bind(this)(...arguments);

      main();

      return val;
    }
  };
})().then(() => {
  console.debug('[XL] Set flags');
});
