// Resume Tailor — Background Service Worker
// Opens the side panel when the toolbar icon is clicked

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
