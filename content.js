document.addEventListener('DOMContentLoaded', e => {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('inject.js');
  document.head.appendChild(s);
  console.debug('[XL] Injected script');
});