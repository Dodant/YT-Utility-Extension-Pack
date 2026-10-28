(() => {
  // CSS does the layout; this only hands it the column count (0 = YouTube default).
  const root = document.documentElement;
  const apply = (cols) => {
    root.toggleAttribute("data-ytcc-on", cols > 0);
    root.style.setProperty("--ytcc-cols", cols);
  };

  chrome.storage.sync.get("cols", ({ cols }) => apply(cols || 0));
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.cols) apply(changes.cols.newValue || 0);
  });
})();
