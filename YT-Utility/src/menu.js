// Top-bar settings button + dropdown. Reads/writes settings through YTU (settings.js).
(() => {
  const el = (tag, props, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
  const GROUPS = [
    ["Watching", [["comment", "Comment Focus"], ["thumbnail", "Thumbnail Peek"], ["nexthover", "Next Hover"], ["peakjump", "Peak Jump"]]],
    ["Feed", [["hidePlaylists", "Hide playlists"], ["hideShorts", "Hide Shorts"]]],
  ];
  const COLS = [["Default", 0], ["3", 3], ["4", 4], ["5", 5]];
  const boxes = {}, chips = [];

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "24"); svg.setAttribute("height", "24");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z");
  svg.append(path);

  const btn = el("button", { id: "ytu-menu-btn", type: "button", ariaLabel: "YT Utility settings", ariaHasPopup: "true", ariaExpanded: "false" }, svg);
  const menu = el("div", { id: "ytu-menu", hidden: true, role: "group" });
  const wrap = el("div", { id: "ytu-menu-wrap" }, btn, menu);
  const head = (t) => menu.append(el("div", { className: "ytu-head", textContent: t }));

  GROUPS.forEach(([title, rows], i) => {
    if (i) menu.append(el("hr"));
    head(title);
    for (const [key, text] of rows) {
      const box = boxes[key] = el("input", { type: "checkbox", checked: YTU.on(key) });
      box.addEventListener("change", () => YTU.set(key, box.checked));
      menu.append(el("label", { className: "ytu-row" }, el("span", { textContent: text }), box));
    }
  });
  head("Videos per row");
  const chipRow = el("div", { className: "ytu-chips" });
  for (const [text, n] of COLS) {
    const chip = el("button", { type: "button", textContent: text });
    chip.addEventListener("click", () => YTU.set("cols", n));
    chips.push([chip, n]);
    chipRow.append(chip);
  }
  menu.append(chipRow);

  const sync = () => chips.forEach(([c, n]) => c.setAttribute("aria-pressed", YTU.get("cols") === n));
  sync();
  YTU.onChange((key, value) => { // storage changes from other tabs land here too
    if (key in boxes) boxes[key].checked = !!value; else if (key === "cols") sync();
  });

  const toggle = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", open); };
  btn.addEventListener("click", () => toggle(menu.hidden));
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !wrap.contains(e.target)) toggle(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { toggle(false); btn.focus(); } });

  // ponytail: polls every 1s; SPA navigation or a narrow window can drop the mic button or re-render the bar. Ceiling: up to 1s without the button; swap for a MutationObserver on ytd-masthead if that shows.
  setInterval(() => {
    const mic = document.querySelector("ytd-masthead #voice-search-button");
    const anchor = mic && mic.offsetParent ? mic : document.querySelector("ytd-masthead #center ytd-searchbox, ytd-masthead #center yt-searchbox");
    if (anchor && anchor.offsetParent) {
      if (!wrap.isConnected || wrap.previousElementSibling !== anchor) anchor.after(wrap);
    } else { // narrow window: #center is hidden, fall back to #end
      const end = document.querySelector("ytd-masthead #end");
      if (end && wrap.parentElement !== end) end.prepend(wrap);
    }
  }, 1000);
})();
