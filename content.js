let storageLocal = chrome.storage.local || browser.storage.local;
let runtime = chrome.runtime || browser.runtime;

console.debug("[XL] Running Content Script");

document.addEventListener("DOMContentLoaded", (e) => {
  console.debug("[XL] Reading SID from CRX storage");
  storageLocal.get(["sid"]).then(({ sid }) => {
    const s = document.createElement("script");
    s.src = runtime.getURL("inject.js");
    s.dataset.sid = sid ? `1${sid}` : "0,null";
    document.head.appendChild(s);
    console.debug("[XL] Injected script");
  });
});

window.addEventListener("load", (e) => {
  let userId = null;

  console.debug("[XL] Trying to get user ID from cookies");
  const cookieUserIdMatch = document.cookie.match(/ajs_user_id=(\d+)/);
  if (cookieUserIdMatch) {
    userId = cookieUserIdMatch[1];
    console.debug("[XL] Got Replit user ID by cookie:", userId);
  } else {
    console.warn("[XL] Could not get Replit user ID");
  }

  if (userId) {
    storageLocal
      .set({
        userId,
      })
      .then(() => {
        console.debug("[XL] Saved user ID to local CRX storage");
      });
  }
});
