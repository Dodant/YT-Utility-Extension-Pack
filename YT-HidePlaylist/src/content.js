(() => {
  // CSS does the hiding; this only flips the switch on <html>.
  const apply = (hide) => document.documentElement.toggleAttribute("data-ythp-on", hide !== false);

  chrome.storage.sync.get("hide", ({ hide }) => apply(hide));
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.hide) apply(changes.hide.newValue);
  });
})();
