(() => {
  // Sidebar items: new lockup UI and legacy compact renderer.
  const ITEM = "#secondary yt-lockup-view-model, #secondary ytd-compact-video-renderer";
  const DWELL_MS = 500; // ignore cursor just passing over the sidebar
  const MARK = "data-ytnh-next";

  let selected = null;   // { item, href }
  let pending = "";      // href we navigated to on ended
  let dwellTimer = null;

  function videoId(href) {
    try { return new URL(href, location.href).searchParams.get("v") || ""; } catch { return ""; }
  }

  function select(item) {
    const link = item.querySelector('a[href*="/watch?v="]');
    if (!link) return;
    selected?.item.removeAttribute(MARK);
    item.setAttribute(MARK, "");
    selected = { item, href: link.href };
  }

  function clear() {
    selected?.item.removeAttribute(MARK);
    selected = null;
  }

  document.addEventListener("pointerover", (e) => {
    const item = e.target.closest?.(ITEM);
    clearTimeout(dwellTimer);
    if (item && item !== selected?.item) dwellTimer = setTimeout(() => select(item), DWELL_MS);
  });

  // Leaving the selected item (or the window: relatedTarget is null) drops the pick.
  document.addEventListener("pointerout", (e) => {
    if (selected && !selected.item.contains(e.relatedTarget)) clear();
  });

  // `ended` doesn't bubble, so listen in capture phase.
  document.addEventListener("ended", (e) => {
    const player = e.target.closest?.("#movie_player");
    if (!player || player.classList.contains("ad-showing") || !selected) return;
    pending = selected.href;
    const link = document.contains(selected.item) && selected.item.querySelector('a[href*="/watch?v="]');
    link ? link.click() : location.assign(pending);
  }, true);

  document.addEventListener("yt-navigate-finish", () => {
    // YouTube autoplay can race our click; if it won, go where the user asked.
    if (pending && videoId(location.href) !== videoId(pending)) {
      const target = pending;
      pending = "";
      location.assign(target);
      return;
    }
    pending = "";
    clear();
  });
})();
