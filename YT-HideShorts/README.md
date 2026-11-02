# YT Hide Shorts

Chrome extension that hides the Shorts shelf and Shorts cards from YouTube feeds.

## How it works

- Toggle **Hide Shorts** from the checkbox in YouTube's top bar. On by default.
- Hides the Shorts shelf and single Shorts cards on the home feed, subscriptions, search results, and the watch-page sidebar.
- A channel's own Shorts tab is left alone.
- The setting syncs across Chrome profiles signed in to the same account, and applies to open tabs immediately.
- On the home feed (and subscriptions), later videos move up to fill the gaps, so rows above shelves like Shorts stay full.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-HideShorts`).

## Notes

- Uses the `storage` permission only to remember the checkbox.
- Matches Shorts shelves by YouTube's shelf elements and Shorts cards by links starting with `/shorts/`. If YouTube changes its markup, `src/content.css` is the place to update.
