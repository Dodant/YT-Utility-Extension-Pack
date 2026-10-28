const box = document.getElementById("hide");
chrome.storage.sync.get("hide", ({ hide }) => { box.checked = hide !== false; });
box.addEventListener("change", () => chrome.storage.sync.set({ hide: box.checked }));
