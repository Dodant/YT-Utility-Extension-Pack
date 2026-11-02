(() => {
  // CSS does the layout; this hands it the column count (0 = YouTube default) and puts a selector in YouTube's top bar.
  const root = document.documentElement;
  const label = document.createElement("label");
  label.id = "ytcc-ctl";
  const sel = document.createElement("select"); // no innerHTML: YouTube enforces Trusted Types
  sel.append(new Option("Default", "0"), new Option("3"), new Option("4"), new Option("5"));
  label.append("Per row ", sel);

  const apply = (cols) => {
    root.toggleAttribute("data-ytcc-on", cols > 0);
    root.style.setProperty("--ytcc-cols", cols);
    sel.value = String(cols);
  };
  sel.addEventListener("change", () => chrome.storage.sync.set({ cols: Number(sel.value) }));

  chrome.storage.sync.get("cols", ({ cols }) => apply(cols || 0));
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.cols) apply(changes.cols.newValue || 0);
  });

  // ponytail: 1s poll re-attaches if YouTube re-renders the top bar; MutationObserver if this ever lags.
  setInterval(() => {
    if (!label.isConnected) document.querySelector("ytd-masthead #end")?.prepend(label);
  }, 1000);
})();
