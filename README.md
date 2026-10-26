# YT-Utils

A collection of small Chrome extensions for watching YouTube on the web. Each folder is a standalone Manifest V3 extension that runs only on `https://www.youtube.com/*`.

| Extension | Folder | Description |
|-----------|--------|-------------|
| YT Comment Focus | [`YT-Comment/`](YT-Comment) | Movable, resizable overlay that shows one comment at a time |
| YT Thumbnail Peek | [`YT-Thumbnail/`](YT-Thumbnail) | Hover the icon beside the video title to preview the current video's thumbnail |
| YT Next Hover | [`YT-NextHover/`](YT-NextHover) | Rest the cursor on a sidebar thumbnail and that video plays when the current one ends |

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the extension folder you want (`YT-Comment`, `YT-Thumbnail`, or `YT-NextHover`).

Each extension is loaded separately, so install only the ones you need.

## YT Comment Focus

Shows comments one at a time in an overlay on the watch page.

- Shows author, post time, content, and like count
- Left/right arrows for previous/next comment, with auto-advance timed to comment length
- Like button, expand replies, and jump to the original comment
- Comments with timestamps like `1:23` or `1:02:03` pop up when the video reaches that point
- Overlay stays visible in fullscreen

YouTube only loads comments that are on screen, so scroll down to the comments section once to load more.

## YT Thumbnail Peek

Hover the small icon to the right of the video title to see the current video's thumbnail at full size. It tries the highest resolution first and falls back to smaller ones.

## YT Next Hover

For when you're eating while watching and want the next video to start without touching anything.

- Keep the cursor on a sidebar thumbnail for 0.5s to select it; it gets an **Up next** badge.
- The selection stays after you move the cursor away. Hover another thumbnail to change it.
- When the current video ends, the selected video plays, taking priority over YouTube autoplay.
- Does nothing when an ad ends.

## Notes

- No data is collected or sent anywhere. The only permission is access to YouTube pages.
- YouTube changes its page markup often, so selectors may need updating if something stops working.
