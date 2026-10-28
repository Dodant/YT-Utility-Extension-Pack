(() => {
  // Option (Mac) / Alt + 1–9: YouTube uses bare digits to seek 0–90%, and Ctrl/Cmd + digit switches tabs.
  document.addEventListener("keydown", (e) => {
    const n = /^Digit([1-9])$/.exec(e.code)?.[1]; // e.code: Option changes e.key to symbols on Mac
    if (!n || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest?.("input, textarea, [contenteditable='true'], [contenteditable='']")) return;

    const video = document.querySelector("#movie_player video");
    const path = document.querySelector("#movie_player .ytp-heat-map-path");
    if (!video || !path || !video.duration) return;

    const box = path.ownerSVGElement?.viewBox.baseVal;
    const peak = findPeaks(path.getAttribute("d") || "", box?.width || 1000, box?.height || 100)[n - 1];
    if (peak === undefined) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    video.currentTime = peak * video.duration;
  }, true);
})();
