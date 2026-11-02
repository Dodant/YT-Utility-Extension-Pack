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
      const kinds = kids.map((el) =>
        !el.matches("ytd-rich-item-renderer") ? "block" : el.offsetParent ? "item" : "hidden");
      if (!active) {
        for (const el of kids) if (el.style.order) el.style.order = "";
        continue;
      }
      arrange(kinds, cols).forEach((i, pos) => {
        if (kids[i].style.order !== String(pos)) kids[i].style.order = pos;
      });
    }
  };

  // Throttled, not debounced: YouTube mutates constantly and a debounce would never fire.
  let timer = 0;
  const schedule = () => { timer ||= setTimeout(() => { timer = 0; fill(); }, 200); };
  const mo = new MutationObserver(schedule);
  mo.observe(document, { childList: true, subtree: true });
  mo.observe(document.documentElement, { attributes: true }); // settings toggles flip <html> attributes
  addEventListener("resize", schedule);
})();
