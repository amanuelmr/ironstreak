// Background service worker: open the dashboard in a tab when the toolbar
// icon is clicked (no popup). Reuses an already-open dashboard tab instead of
// opening duplicates. Needs no permissions beyond "storage" (for the tab id).

const DASHBOARD_URL = chrome.runtime.getURL("dashboard.html");

chrome.action.onClicked.addListener(async () => {
  const { dashboardTabId } = await chrome.storage.session.get("dashboardTabId");

  if (typeof dashboardTabId === "number") {
    try {
      const tab = await chrome.tabs.get(dashboardTabId);
      if (tab.id != null) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        return;
      }
    } catch {
      // tab was closed — fall through and open a fresh one
    }
  }

  const tab = await chrome.tabs.create({ url: DASHBOARD_URL });
  await chrome.storage.session.set({ dashboardTabId: tab.id });
});
