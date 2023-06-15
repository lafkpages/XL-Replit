// Get theme
chrome.storage.local.get(['themeValues'], ({ themeValues }) => {
  console.debug('[XL] Got theme values from local CRX storage:', themeValues);
});