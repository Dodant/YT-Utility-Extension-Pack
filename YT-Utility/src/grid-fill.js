// Hidden cards or a changed column count leave a partial row above full-width shelves (Shorts etc.).
// Flex `order` pushes each shelf down until the row above it is full, so later videos fill the gap.
// Only active while a feed option (hide playlists, hide Shorts, column count) is on; otherwise it clears its own `order`s.

// kinds: "item" | "hidden" | "block", in page order. Returns indices in display order.
function arrange(kinds, cols) {
  const out = [], waiting = [];
  let inRow = 0;
  kinds.forEach((k, i) => {
    if (k === "block") return inRow ? waiting.push(i) : out.push(i);
    out.push(i);
    if (k === "item" && (inRow = (inRow + 1) % cols) === 0) out.push(...waiting.splice(0));
  });
  return out.concat(waiting);
}

// flags: {hideplaylists, hideshorts, cols} booleans.
function feedActive(flags) {
  return flags.hideplaylists || flags.hideshorts || flags.cols;
}

if (typeof document !== "undefined") (() => {
  const fill = () => {
    const has = (k) => document.documentElement.hasAttribute("data-ytu-" + k);
    const active = feedActive({ hideplaylists: has("hideplaylists"), hideshorts: has("hideshorts"), cols: has("cols") });
    for (const grid of document.querySelectorAll('ytd-browse:is([page-subtype="home"], [page-subtype="subscriptions"]) ytd-rich-grid-renderer')) {
      const cols = parseInt(getComputedStyle(grid).getPropertyValue("--ytd-rich-grid-items-per-row")) || 0;
      const box = grid.querySelector(":scope > #contents");
      if (!cols || !box) continue;
      const kids = [...box.children].flatMap((c) =>
        c.matches("ytd-rich-grid-row") ? [...(c.querySelector("#contents")?.children ?? [])] : [c]);
      if (!active) {
        for (const el of kids) if (el.style.order) el.style.order = "";
        continue;
      }
      if (!grid.offsetParent) continue; // hidden home feed kept in the DOM on watch pages: skip the layout reads
      const kinds = kids.map((el) =>
        !el.matches("ytd-rich-item-renderer") ? "block" : el.offsetParent ? "item" : "hidden");
      arrange(kinds, cols).forEach((i, pos) => {
        if (kids[i].style.order !== String(pos)) kids[i].style.order = pos;
      });
    }
  };

  // Search grid copies the home feed's column count: the chosen "Videos per row", else YouTube's own count on the home grid
  // (still in the DOM after visiting home). Neither known (search opened directly) -> feed.css falls back to auto-fill.
  const syncSearchCols = () => {
    const root = document.documentElement;
    const home = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
    const n = YTU.get("cols") || (home && parseInt(getComputedStyle(home).getPropertyValue("--ytd-rich-grid-items-per-row"))) || 0;
    if (root.style.getPropertyValue("--ytu-search-cols") !== String(n)) root.style.setProperty("--ytu-search-cols", n);
    if (root.hasAttribute("data-ytu-searchcols") !== n > 0) root.toggleAttribute("data-ytu-searchcols", n > 0);
    if (root.hasAttribute("data-ytu-searchdense") !== n >= 4) root.toggleAttribute("data-ytu-searchdense", n >= 4); // smaller titles
  };

  // Throttled, not debounced: YouTube mutates constantly and a debounce would never fire.
  let timer = 0;
  const schedule = () => { timer ||= setTimeout(() => { timer = 0; fill(); syncSearchCols(); }, 200); };
  const mo = new MutationObserver(schedule);
  mo.observe(document, { childList: true, subtree: true });
  mo.observe(document.documentElement, { attributes: true }); // settings toggles flip <html> attributes
  addEventListener("resize", schedule);
})();
