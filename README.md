# YT-Utility-Extension-Pack

**YT Utility** is a single Manifest V3 Chrome extension for watching YouTube on the web. One button next to the search box opens a menu to toggle each feature.

## Features

Click the button to the right of YouTube's search box to open the menu. Everything is on by default; changes apply live to all open YouTube tabs and sync through `chrome.storage.sync`.

**Watching**

- **Comment Focus**: movable, resizable overlay that shows one comment at a time. Left/right arrows or auto-advance, like, replies, and timestamp pop-ups (`1:23`). Scroll to the comments once so YouTube loads them.
- **Thumbnail Peek**: hover the icon beside the video title to see the thumbnail at full size.
- **Next Hover**: rest the cursor on a sidebar thumbnail for 0.5s and it plays when the current video ends (not after ads).
- **Peak Jump**: **Option/Alt + 1-9** jumps to the "Most replayed" peaks, highest first.

**Feed**

- **Hide playlists**: removes playlist and mix cards from the home feed, search, and watch sidebar.
- **Hide Shorts**: removes the Shorts shelf and cards (a channel's Shorts tab is untouched).
- **Videos per row**: Default / 3 / 4 / 5 on the home feed.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `YT-Utility` folder.

## Notes

- Only the `storage` permission, and it runs only on `https://www.youtube.com/*`. No data is sent anywhere; Peak Jump fetches the same-origin watch page to read "Most replayed" data.
- YouTube changes its page markup often, so selectors may need updating if something stops working.
