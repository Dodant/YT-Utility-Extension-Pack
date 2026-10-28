const sel = document.getElementById("cols");
chrome.storage.sync.get("cols", ({ cols }) => { sel.value = String(cols || 0); });
sel.addEventListener("change", () => chrome.storage.sync.set({ cols: Number(sel.value) }));
