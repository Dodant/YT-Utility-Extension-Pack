# YT Comment Focus

Chrome extension that shows YouTube comments one at a time on watch pages.

## Features

- Shows currently loaded YouTube comments one by one, in the page's DOM order (Top comments by default)
- Displays author, post time, content, and like count
- Left/right arrows to move to the previous/next comment
- Like button that works directly from the card
- Reply count button jumps to the original comment and expands its replies
- Clicking the card scrolls to the original comment and highlights it
- Comments with timestamps like `1:23`, `12:34`, or `1:02:03` appear automatically when the video reaches that time
- **The overlay stays visible in fullscreen, so you can keep reading comments**
- UI text is fixed to English

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-Comment`).

## Tips

- YouTube only loads visible comments into the DOM. Scroll down to the comments section once and the extension picks up more comments.
- Comment order follows what YouTube currently has loaded. If YouTube is sorted by Top comments, the extension shows them in that order.
- Like and reply actions click YouTube's own buttons and inputs on the signed-in page.
