# YT Hide Playlist

Chrome extension that hides playlist and mix cards from YouTube recommendations. Useful when listening to a lot of music fills your feed with playlists.

## How it works

- Toggle **Hide playlists** from the checkbox in YouTube's top bar. On by default.
- Hides playlist/mix cards on the home feed, search results, and the watch-page sidebar.
- Your library, channel playlist tabs, and the playlist panel of a playlist you're watching are left alone.
- The setting syncs across Chrome profiles signed in to the same account, and applies to open tabs immediately.
- On the home feed (and subscriptions), later videos move up to fill the gaps, so rows above shelves like Shorts stay full.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-HidePlaylist`).

## Notes

- Uses the `storage` permission only to remember the checkbox.
- A card is treated as a playlist if its link contains `list=`. If YouTube changes its markup, `src/content.css` is the place to update.
