// Shared settings for all YT Utility scripts (global `YTU`). Runs at document_start: only documentElement exists.
// Each setting mirrors onto <html> as data-ytu-<key> (booleans, while true) so CSS can switch on it.
var YTU = (() => {
  const DEFAULTS = { comment: true, thumbnail: true, nexthover: true, peakjump: true, hidePlaylists: true, hideShorts: true, cols: 0 };
  const state = { ...DEFAULTS };
  const listeners = [];
  const root = document.documentElement;

  const reflect = (key, value) => {
    const attr = "data-ytu-" + key.toLowerCase();
    if (key === "cols") root.style.setProperty("--ytu-cols", value);
    root.toggleAttribute(attr, key === "cols" ? value > 0 : !!value);
  };
  const apply = (key, value) => {
    if (!(key in DEFAULTS) || state[key] === value) return;
    state[key] = value;
    reflect(key, value);
    listeners.forEach((fn) => fn(key, value));
  };

  for (const k in DEFAULTS) reflect(k, DEFAULTS[k]); // defaults visible before storage answers
  chrome.storage.sync.get(DEFAULTS, (items) => { for (const k in DEFAULTS) apply(k, items[k]); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") for (const k in changes) apply(k, changes[k].newValue ?? DEFAULTS[k]);
  });

  return {
    DEFAULTS,
    on: (key) => !!state[key],
    get: (key) => state[key],
    set: (key, value) => {
      try { chrome.storage.sync.set({ [key]: value }); }
      catch { listeners.forEach((fn) => fn(key, state[key])); } // stale tab (extension reloaded): revert the control
    },
    onChange: (fn) => listeners.push(fn),
  };
})();
