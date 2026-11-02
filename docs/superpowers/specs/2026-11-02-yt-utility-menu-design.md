# YT Utility: one extension, one top-bar menu

Date: 2026-11-02

## Intent

The repo has seven separate Chrome extensions (YT Comment Focus, YT Thumbnail Peek, YT Next Hover,
YT Peak Jump, YT Hide Playlist, YT Hide Shorts, YT Column Control). The owner wants them merged into
**one extension** whose settings live behind **one button in YouTube's top bar**, right of the search
box and mic button, styled so it looks like a feature YouTube shipped itself.

Why: installing and managing seven extensions is clumsy, and the per-extension controls scattered in
the top bar (checkbox, selector) don't look native.

## Goals

- One Manifest V3 extension containing all seven features.
- A round icon button immediately right of YouTube's mic (voice search) button, same size and look as
  the mic button, light and dark theme.
- Clicking it opens a dropdown menu (layout "B with checkboxes", agreed via mockup):

  ```
  Watching
    Comment Focus         [x]
    Thumbnail Peek        [x]
    Next Hover            [x]
    Peak Jump             [x]
  ─────────────
  Feed
    Hide playlists        [x]
    Hide Shorts           [ ]
  Videos per row
    (Default) (3) (4) (5)      ← chips, one selected
  ```

  - Six features are checkboxes; videos per row is a row of chips (pick one).
  - Two group headers, "Watching" and "Feed", with a divider.
  - Menu width about **230px** (owner asked for it narrower than the first 290px mockup).
  - All UI text in **English**.
  - Look follows YouTube's own menus: white/dark surface, 12px radius, soft shadow, Roboto 14px,
    YouTube blue (#065fd4) for checked boxes, dark chip for the selected column count.
- Changes apply immediately to every open YouTube tab, no reload, and persist (chrome.storage.sync).

## Non-goals

- No toolbar popup or extension icon menu. Settings exist only in the top-bar menu (owner removed the
  popups earlier on purpose).
- No new features beyond the seven, no per-feature sub-settings.
- No Chrome Web Store packaging work in this project.

## Anti-goals (would be a failure even if it works)

- The button or menu looks bolted on: wrong size, misaligned with the mic button, or clashing with
  dark mode.
- A feature that is unchecked still does something visible (overlay, badge, hover icon, shortcut,
  hidden cards, changed grid).
- Merging breaks a feature that works today.

## Decided

- Grouping, labels, and control types exactly as in the menu above.
- The old standalone top-bar checkbox/selector controls go away; the menu replaces them.
- The feature behavior itself is unchanged; reuse the existing code from each folder.

## Builder's calls (my calls, the owner did not decide these)

- **Folder and name:** new folder `YT-Utility/`, extension name "YT Utility", version 0.1.0.
- **Defaults:** all six checkboxes on (matches each standalone extension's current default), videos per
  row Default.
- **Old folders:** delete the seven standalone folders once the merged one is verified, and update the
  root README to describe the single extension. (Git history keeps the old code.)
- **Turning features off at runtime:** keep each module's code loaded; gate it with a per-module
  attribute on `<html>` (e.g. `data-ytu-comment`) for CSS-driven parts and an in-memory flag that
  event handlers check for JS-driven parts. Unchecking must remove anything the module has already put
  on the page (Comment Focus overlay, Thumbnail Peek icon/popover, Next Hover "Up next" badge and
  selection). Re-checking brings it back without a reload.
- **Button icon:** a simple outline icon (sliders/tune style) drawn as inline SVG, no new image assets.
- **Menu behavior:** opens on click, closes on outside click, Escape, or clicking the button again;
  keyboard-focusable; checkbox rows toggle when the whole row is clicked.
- **Shared grid code:** `grid-fill.js` and the row-flattening CSS currently copied into three folders
  become one copy, active whenever Hide playlists, Hide Shorts, or a non-Default column count is on.
- **Re-attaching the button:** YouTube re-renders the masthead; reuse the existing 1-second poll
  pattern to re-insert the button if it disappears.
- **No innerHTML in the new button and menu** (YouTube enforces Trusted Types); build them with DOM APIs.
  Existing modules that use innerHTML today (Comment Focus, Thumbnail Peek) move over unchanged; rewriting
  them is out of scope since they work.
- **Storage keys:** one key per setting (Hide playlists and Hide Shorts both use `hide` today, so they
  must get separate keys). No migration: the merged extension is new, and defaults match the old ones.
- **Drop leftovers:** Comment Focus's manifest `action` entry goes (no popups). Node tests move into
  `YT-Utility/` and keep passing.
- **Mic button missing** (narrow window or no voice search): insert right of the search box instead.
- **Comment Focus off** also stops its auto-scrolling and polling, not just the overlay.

## Constraints

- Runs only on `https://www.youtube.com/*`; permissions limited to `storage`.
- No build step, no dependencies; plain JS/CSS content scripts like the current folders.
- Existing node tests (`peaks.test.js`, `grid-fill.test.js`) keep passing.
- Peak Jump's page fetch (`/watch?v=…`) stays same-origin.

## Existing code to reuse

| Feature | Current location | Size |
|---|---|---|
| Comment Focus | `YT-Comment/src/content.{js,css}` | ~1600 + 540 lines |
| Thumbnail Peek | `YT-Thumbnail/content.{js,css}` | ~200 + 170 lines |
| Next Hover | `YT-NextHover/src/content.{js,css}` | ~60 + 25 lines |
| Peak Jump | `YT-PeakJump/src/{peaks,content}.js` | ~45 lines |
| Hide playlists | `YT-HidePlaylist/src/content.{js,css}` | small |
| Hide Shorts | `YT-HideShorts/src/content.{js,css}` | small |
| Videos per row | `YT-ColumnControl/src/content.{js,css}` + `grid-fill.js` | small |

## Open for verification

- The browser extension for live testing was not connected during design; final verification needs a
  real YouTube session (button placement next to the mic, dark mode, each toggle on/off).
