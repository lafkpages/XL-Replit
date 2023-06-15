import { applyGlobalThemeValuesToElement } from "./util/theme";

// Get theme
chrome.storage.local.get(['themeValues'], ({ themeValues }) => {
  // Apply theme
  applyGlobalThemeValuesToElement(themeValues, document.body);
});