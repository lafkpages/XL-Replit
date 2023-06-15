import { applyGlobalThemeValuesToElement } from "./util/theme";

// Get theme
chrome.storage.local.get(['themeValues'], ({ themeValues }) => {
  applyGlobalThemeValuesToElement(themeValues, document.body);
});