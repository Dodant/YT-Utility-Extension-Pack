(() => {
  // CSS does the hiding; this flips the switch on <html> and puts a checkbox in YouTube's top bar.
  const label = document.createElement("label");
  label.id = "ythp-ctl";
  const box = Object.assign(document.createElement("input"), { type: "checkbox" });
  label.append(box, " Hide playlists"); // no innerHTML: YouTube enforces Trusted Types

  const apply = (hide) => {
    document.documentElement.toggleAttribute("data-ythp-on", hide !== false);
    box.checked = hide !== false;
  };
  box.addEventListener("change", () => chrome.storage.sync.set({ hide: box.checked }));

  chrome.storage.sync.get("hide", ({ hide }) => apply(hide));
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.hide) apply(changes.hide.newValue);
  });

  // ponytail: 1s poll re-attaches if YouTube re-renders the top bar; MutationObserver if this ever lags.
  setInterval(() => {
    if (!label.isConnected) document.querySelector("ytd-masthead #end")?.prepend(label);
  }, 1000);
})();
