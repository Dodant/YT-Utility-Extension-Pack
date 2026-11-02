# YT Utility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the seven YT-* extensions into one `YT-Utility/` extension whose settings live in a native-looking dropdown behind a button right of YouTube's mic button.

**Architecture:** One shared settings script (`settings.js`) loads `chrome.storage.sync`, mirrors each setting onto `<html>` attributes for CSS-driven features, and exposes a tiny `YTU` global that JS-driven modules check and subscribe to. Each existing feature is copied in nearly unchanged with a one-line gate. A menu script injects the button and dropdown.

**Tech Stack:** Manifest V3, plain JS/CSS content scripts, no build step, no dependencies. Node (`node file.test.js`) for the two pure-logic tests.

**Spec:** `docs/superpowers/specs/2026-11-02-yt-utility-menu-design.md`

## Global Constraints

- Runs only on `https://www.youtube.com/*`; permissions: `storage` only.
- No build step, no dependencies, no innerHTML in the new button/menu (Trusted Types). Ported modules keep their existing innerHTML.
- All UI text English. Menu labels exactly: group "Watching": `Comment Focus`, `Thumbnail Peek`, `Next Hover`, `Peak Jump`; group "Feed": `Hide playlists`, `Hide Shorts`; header `Videos per row` with chips `Default`, `3`, `4`, `5`.
- Menu width 230px; 12px radius; Roboto 14px; checked color `#065fd4`; selected chip dark (light theme) / light (dark theme).
- Defaults: all six checkboxes on, Videos per row = Default (0).
- Changes apply live to every open YouTube tab, no reload.
- Extension name "YT Utility", folder `YT-Utility/`, version `0.1.0`.

## Review Focus

1. Narrow window / no voice search: `#voice-search-button` is missing or hidden → button sits right of the search box instead, still clickable.
2. Setting changed in another tab → this tab's open menu checkboxes/chips update too (not just the page behavior).
3. Comment Focus unchecked while in fullscreen (overlay was re-parented into the fullscreen element) → overlay disappears; no scrolling to comments happens afterwards.
4. All three feed options turned off → grid looks exactly like stock YouTube again (rows restored, no leftover `style.order`), without reload.
5. SPA navigation home → watch → home, and theme switch light ↔ dark → button stays in place and menu colors follow the theme.

Each line has its manual check in the task that owns the code (marked **RF1–RF5**).

---

## File Structure

```
YT-Utility/
  manifest.json
  README.md
  src/
    settings.js          # YTU global: defaults, storage sync, <html> attributes, change events
    menu.js  menu.css    # top-bar button + dropdown
    feed.css             # hide playlists / hide Shorts / videos per row / row flattening
    grid-fill.js         # moved from YT-ColumnControl, gated on feed attributes
    grid-fill.test.js
    peaks.js             # moved from YT-PeakJump unchanged
    peaks.test.js
    peakjump.js          # YT-PeakJump/src/content.js + gate
    nexthover.js nexthover.css   # YT-NextHover + gate
    thumbnail.js thumbnail.css   # YT-Thumbnail + gate
    comment.js comment.css       # YT-Comment + gate
```

Manifest `content_scripts` (two entries, same isolated world so `YTU` is shared):

1. `run_at: "document_start"`: js `src/settings.js`, `src/grid-fill.js`; css `src/feed.css`.
2. `run_at: "document_idle"`: js `src/peaks.js`, `src/peakjump.js`, `src/nexthover.js`, `src/thumbnail.js`, `src/comment.js`, `src/menu.js`; css `src/nexthover.css`, `src/thumbnail.css`, `src/comment.css`, `src/menu.css`.

No `action`, no popup.

---

### Task 1: Extension skeleton, settings core, feed features

**Files:**
- Create: `YT-Utility/manifest.json`, `YT-Utility/src/settings.js`, `YT-Utility/src/feed.css`
- Move: `YT-ColumnControl/src/grid-fill.js` → `YT-Utility/src/grid-fill.js` (modify), `YT-ColumnControl/src/grid-fill.test.js` → `YT-Utility/src/grid-fill.test.js`
- The manifest lists only files that exist after this task; later tasks add theirs.

**Interfaces:**
- Produces (global `YTU`, defined in `settings.js`):
  - `YTU.DEFAULTS = { comment: true, thumbnail: true, nexthover: true, peakjump: true, hidePlaylists: true, hideShorts: true, cols: 0 }`
  - `YTU.on(key: string) -> boolean` — current boolean value.
  - `YTU.get(key: string) -> any` — current value (used for `cols`).
  - `YTU.set(key: string, value) -> void` — writes `chrome.storage.sync`.
  - `YTU.onChange(fn: (key: string, value) => void) -> void` — fired for every key whose effective value changes (initial storage load included, and changes from other tabs).
  - `<html>` attributes: `data-ytu-<lowercased key>` present while a boolean is true (`data-ytu-comment`, `data-ytu-thumbnail`, `data-ytu-nexthover`, `data-ytu-peakjump`, `data-ytu-hideplaylists`, `data-ytu-hideshorts`); `data-ytu-cols` present when `cols > 0`, plus CSS var `--ytu-cols` on `<html>`.
  - Storage: one `chrome.storage.sync` key per setting, same names as `DEFAULTS`; read with `chrome.storage.sync.get(YTU.DEFAULTS, …)`.

- [ ] **Step 1: Move the grid-fill test and make it check the new gate helper**

Add to `grid-fill.test.js` (keep the three existing `arrange` assertions):

```js
// Feed layout is only touched while a feed option is on.
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: false, cols: false }), false);
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: true, cols: false }), true);
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: false, cols: true }), true);
```

- [ ] **Step 2: Run it, expect failure**

Run: `node YT-Utility/src/grid-fill.test.js` — Expected: `ReferenceError: feedActive is not defined`.

- [ ] **Step 3: Implement `feedActive(flags: {hideplaylists, hideshorts, cols}) -> boolean` in `grid-fill.js`** and use it in `fill()`: read the three flags from `document.documentElement.hasAttribute("data-ytu-…")`; when inactive, remove `style.order` from every flattened child that has one and return. Update the header comment (single copy now, no "same file ships in…").

- [ ] **Step 4: Run test, expect `ok`**

- [ ] **Step 5: Write `settings.js` and `feed.css`**

`feed.css` = the hide rules from `YT-HidePlaylist/src/content.css` and `YT-HideShorts/src/content.css`, the per-row variable rule from `YT-ColumnControl/src/content.css`, with selectors switched to `html[data-ytu-hideplaylists]`, `html[data-ytu-hideshorts]`, `html[data-ytu-cols]` / `var(--ytu-cols)`. Row-flattening rule gated on `html:is([data-ytu-hideplaylists], [data-ytu-hideshorts], [data-ytu-cols])`. Drop the old `#ythp-ctl`/`#ytcc-ctl`/`#yths-ctl` styles.

- [ ] **Step 6: Manual check in Chrome**

Disable the old standalone YT-* extensions, then load unpacked `YT-Utility/`. On the home feed: playlists and the Shorts shelf are hidden, no top-bar checkbox appears. In DevTools, switch the console context dropdown to "YT Utility" and run `YTU.set("cols", 4)` → home grid reflows to 4 per row; `YTU.set("hideShorts", false)` → Shorts shelf returns live.
**RF4:** `YTU.set("hidePlaylists", false); YTU.set("hideShorts", false); YTU.set("cols", 0)` → grid identical to stock YouTube; `document.querySelectorAll('ytd-rich-item-renderer[style*="order"]').length === 0`.

- [ ] **Step 7: Commit** — `git add YT-Utility YT-ColumnControl/src/grid-fill*.js && git commit -m "YT Utility: settings core and feed features"`

---

### Task 2: Top-bar button and menu

**Files:**
- Create: `YT-Utility/src/menu.js`, `YT-Utility/src/menu.css`
- Modify: `YT-Utility/manifest.json` (add both to the idle entry)

**Interfaces:**
- Consumes: `YTU.on`, `YTU.get`, `YTU.set`, `YTU.onChange` (Task 1).
- Produces: nothing other tasks use. DOM ids: wrapper `#ytu-menu-wrap`, button `#ytu-menu-btn`, dropdown `#ytu-menu`.

- [ ] **Step 1: Implement `menu.js`**
  - Build with DOM APIs only. Button: `<button id="ytu-menu-btn" aria-label="YT Utility settings" aria-haspopup="true" aria-expanded>` containing an inline SVG outline "tune/sliders" icon (24px, `currentColor`).
  - Dropdown structure, in order: header `Watching`; checkbox rows for `comment`, `thumbnail`, `nexthover`, `peakjump` with the Global Constraints labels; divider; header `Feed`; rows `hidePlaylists`, `hideShorts`; header `Videos per row`; chip row `Default`(0) `3` `4` `5` as `<button aria-pressed>`.
  - Each row is a `<label>` wrapping a native `<input type="checkbox">`, so clicking anywhere on the row toggles it. `change` → `YTU.set(key, checked)`; chip click → `YTU.set("cols", n)`.
  - `YTU.onChange` updates the matching checkbox / chip (**RF2**).
  - Open/close: button click toggles; outside `pointerdown`, `Escape`, and a second button click close; Escape returns focus to the button.
  - Placement, re-checked every 1000 ms (`ponytail:` comment like the existing poll): if `#ytu-menu-wrap` is not connected, insert it right after `ytd-masthead #voice-search-button`; if that element is missing or `offsetParent === null`, insert after `ytd-masthead #center ytd-searchbox, ytd-masthead #center yt-searchbox` (whichever exists) (**RF1**).

- [ ] **Step 2: Implement `menu.css`**
  - Button: 40×40 circle, margin-left 8px like the mic button, background `var(--yt-spec-badge-chip-background)`, hover `var(--yt-spec-10-percent-layer)`, icon color `var(--yt-spec-text-primary)`.
  - Dropdown: `position: absolute`, below the button, width 230px, radius 12px, background `var(--yt-spec-menu-background, var(--yt-spec-raised-background))`, shadow `0 4px 32px rgba(0,0,0,.1)`, padding 8px 0, Roboto 14px, `z-index` above the masthead (2100+). Headers 13px `var(--yt-spec-text-secondary)`. Rows 36px tall, label left, checkbox right with `accent-color: #065fd4`. Selected chip: background `var(--yt-spec-text-primary)`, color `var(--yt-spec-base-background)`; others `var(--yt-spec-badge-chip-background)`.

- [ ] **Step 3: Manual check**
  - Button appears immediately right of the mic, same height and vertical center; menu opens below it with the exact labels and 230px width.
  - Toggling `Hide Shorts` and chips changes the feed live; reload keeps the values.
  - **RF1:** narrow the window until the mic disappears → button sits right of the search box.
  - **RF2:** two YouTube tabs, menu open in tab A, change a setting in tab B → tab A's checkbox flips.
  - **RF5:** home → open a video → back home: button still there. Switch YouTube appearance light ↔ dark: button and menu colors follow.

- [ ] **Step 4: Commit** — `git commit -m "YT Utility: top-bar settings menu"`

---

### Task 3: Port Peak Jump and Next Hover

**Files:**
- Copy: `YT-PeakJump/src/peaks.js` → `YT-Utility/src/peaks.js` (unchanged), `YT-PeakJump/src/peaks.test.js` → `YT-Utility/src/peaks.test.js` (unchanged)
- Create: `YT-Utility/src/peakjump.js` from `YT-PeakJump/src/content.js`
- Create: `YT-Utility/src/nexthover.{js,css}` from `YT-NextHover/src/content.{js,css}`
- Modify: manifest idle entry

**Interfaces:**
- Consumes: `YTU.on("peakjump")`, `YTU.on("nexthover")`, `YTU.onChange` (Task 1).

- [ ] **Step 1: Run `node YT-Utility/src/peaks.test.js`** — Expected: `ok`.
- [ ] **Step 2: Gate Peak Jump** — in the keydown handler, return before `preventDefault` when `!YTU.on("peakjump")`, so Option/Alt+digit falls through to YouTube.
- [ ] **Step 3: Gate Next Hover** — `pointerover` and the `ended` handler return when `!YTU.on("nexthover")`; `YTU.onChange((k, v) => { if (k === "nexthover" && !v) clear(); })` drops any current "Up next" badge.
- [ ] **Step 4: Manual check** — On a watch page with "Most replayed": Option+1 jumps; uncheck Peak Jump → Option+1 does nothing extra. Rest on a sidebar thumbnail 0.5s → "Up next" badge; uncheck Next Hover while the badge shows → badge disappears and the video end follows YouTube autoplay.
- [ ] **Step 5: Commit** — `git commit -m "YT Utility: port Peak Jump and Next Hover"`

---

### Task 4: Port Thumbnail Peek and Comment Focus

**Files:**
- Create: `YT-Utility/src/thumbnail.{js,css}` from `YT-Thumbnail/content.{js,css}`
- Create: `YT-Utility/src/comment.{js,css}` from `YT-Comment/src/content.{js,css}`
- Modify: manifest idle entry

**Interfaces:**
- Consumes: `YTU.on("thumbnail")`, `YTU.on("comment")`, `YTU.onChange` (Task 1).

- [ ] **Step 1: Gate Thumbnail Peek** — first line of `attachAnchor()`: `if (!YTU.on("thumbnail")) return removeAnchor();`. Subscribe: `YTU.onChange((k) => { if (k === "thumbnail") scheduleAttach(); })`.
- [ ] **Step 2: Gate Comment Focus** — `isPlayableVideoPage()` returns `false` when `!YTU.on("comment")` (this already hides the overlay, clears state, and makes `scanComments` return before any `requestCommentsLoad` scroll). Subscribe: `YTU.onChange((k) => { if (k === "comment") { updateOverlayVisibility(); scheduleScan(0); } })`.
- [ ] **Step 3: Manual check**
  - Watch page: thumbnail icon beside the title shows the popover; uncheck Thumbnail Peek → icon gone; re-check → back without reload.
  - Comment overlay shows and cycles comments; uncheck Comment Focus → overlay gone, page no longer scrolls toward comments; re-check → overlay returns.
  - **RF3:** enter fullscreen with the overlay visible; from the "YT Utility" console context run `YTU.set("comment", false)` → overlay disappears while still fullscreen. Exit fullscreen → no overlay, and the page scroll position stays put for 10s.
- [ ] **Step 4: Commit** — `git commit -m "YT Utility: port Thumbnail Peek and Comment Focus"`

---

### Task 5: Remove the standalone extensions and update docs

**Files:**
- Delete: `YT-Comment/`, `YT-Thumbnail/`, `YT-NextHover/`, `YT-PeakJump/`, `YT-HidePlaylist/`, `YT-HideShorts/`, `YT-ColumnControl/`
- Create: `YT-Utility/README.md`
- Modify: `README.md`

- [ ] **Step 1: Check the history has everything** — `git log --oneline -- YT-HideShorts YT-PeakJump/src/peaks.js YT-ColumnControl/src/grid-fill.js` shows commits (all were committed on 2026-11-02 before this plan).
- [ ] **Step 2: Delete the seven folders** (`git rm -r`).
- [ ] **Step 3: Write `YT-Utility/README.md`** — what the button is, the menu items with one line each (reuse the feature descriptions from the root README), install (Load unpacked `YT-Utility`), `storage` permission note, no data sent anywhere.
- [ ] **Step 4: Rewrite root `README.md`** — single-extension description and install. Keep the owner's uncommitted "This & Into This" table as it is in the working tree; do not stage or alter it unless the owner says so.
- [ ] **Step 5: Run both tests** — `node YT-Utility/src/peaks.test.js && node YT-Utility/src/grid-fill.test.js` → `ok` twice. Reload the unpacked extension and repeat one quick check per feature.
- [ ] **Step 6: Commit** — `git commit -m "Replace standalone extensions with YT Utility"`
