# YT Column Control

Chrome extension that sets how many videos fit in each row of the YouTube home feed. More columns means smaller thumbnails.

## How it works

- Click the extension icon and pick **Videos per row** (3–5). **Default** leaves YouTube's own layout.
- Applies to the home feed only, and to open tabs immediately.
- The setting syncs across Chrome profiles signed in to the same account.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-ColumnControl`).

## Notes

- Uses the `storage` permission only to remember the setting.
- Works by overriding YouTube's `--ytd-rich-grid-items-per-row` variable. If YouTube changes its markup, `src/content.css` is the place to update.
