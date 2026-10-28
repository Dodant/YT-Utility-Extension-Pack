# YT-Utility-Extension-Pack

A collection of small Chrome extensions for watching YouTube on the web. Each folder is a standalone Manifest V3 extension that runs only on `https://www.youtube.com/*`.

| Extension | Folder | Description |
|-----------|--------|-------------|
| YT Comment Focus | [`YT-Comment/`](YT-Comment) | Movable, resizable overlay that shows one comment at a time |
| YT Thumbnail Peek | [`YT-Thumbnail/`](YT-Thumbnail) | Hover the icon beside the video title to preview the current video's thumbnail |
| YT Next Hover | [`YT-NextHover/`](YT-NextHover) | Rest the cursor on a sidebar thumbnail and that video plays when the current one ends |
| YT Hide Playlist | [`YT-HidePlaylist/`](YT-HidePlaylist) | Checkbox to hide playlist and mix cards from recommendations |
| YT Column Control | [`YT-ColumnControl/`](YT-ColumnControl) | Choose how many videos fit in each row of the home feed |
| YT Peak Jump | [`YT-PeakJump/`](YT-PeakJump) | Option/Alt + 1–9 jumps to the most replayed moments |

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the extension folder you want (`YT-Comment`, `YT-Thumbnail`, `YT-NextHover`, `YT-HidePlaylist`, `YT-ColumnControl`, or `YT-PeakJump`).

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
- Moving the cursor off the thumbnail clears the selection.
- When the current video ends, the selected video plays, taking priority over YouTube autoplay.
- Does nothing when an ad ends.

## YT Hide Playlist

For when listening to music fills your recommendations with playlists.

- Click the extension icon and toggle **Hide playlists** (on by default).
- Hides playlist and mix cards on the home feed, search results, and the watch-page sidebar. Your library and channel playlist tabs are untouched.

## YT Column Control

For when home feed thumbnails look too big.

- Click the extension icon and pick **Videos per row** (3–5), or **Default** for YouTube's layout.
- Applies to the home feed only.

## YT Peak Jump

Jumps to the peaks of the "Most replayed" graph above the progress bar.

- **Option + 1** (Mac) / **Alt + 1** jumps to the highest peak, **+ 2** to the second highest, up to **+ 9**.
- Does nothing on videos without the graph.

## Notes

- No data is collected or sent anywhere. Extensions only access YouTube pages; YT Hide Playlist and YT Column Control also use `storage` to remember their setting.
- YouTube changes its page markup often, so selectors may need updating if something stops working.
