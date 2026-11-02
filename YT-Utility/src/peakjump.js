(() => {
  // Option (Mac) / Alt + 1–9: YouTube uses bare digits to seek 0–90%, and Ctrl/Cmd + digit switches tabs.
  const cache = new Map(); // video id -> Promise<peaks in ms>
  const peaksFor = (id) => {
    if (!cache.has(id)) {
      cache.set(id, fetch(`/watch?v=${id}`).then((r) => r.text()).then(findPeaks).catch(() => (cache.delete(id), [])));
    }
    return cache.get(id);
  };

  document.addEventListener("keydown", (e) => {
    const n = /^Digit([1-9])$/.exec(e.code)?.[1]; // e.code: Option changes e.key to symbols on Mac
    if (!YTU.on("peakjump")) return;
    if (!n || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest?.("input, textarea, [contenteditable='true'], [contenteditable='']")) return;

    const id = new URLSearchParams(location.search).get("v");
    const video = document.querySelector("#movie_player video");
    if (location.pathname !== "/watch" || !id || !video) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    peaksFor(id).then((peaks) => {
      const ms = peaks[n - 1];
      if (ms !== undefined) video.currentTime = ms / 1000;
    });
  }, true);
})();
