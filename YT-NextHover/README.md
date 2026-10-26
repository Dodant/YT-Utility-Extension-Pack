# YT Next Hover

Chrome extension that plays the sidebar video you're hovering when the current YouTube video ends. Handy when you're eating while watching and don't want to touch the keyboard.

## How it works

- Keep the cursor on a thumbnail in the right sidebar for 0.5s to select it. It gets an outline and an **Up next** badge.
- Moving the cursor off the thumbnail clears the selection. Keep it there until the video ends.
- When the current video ends, the selected video plays. If YouTube autoplay jumps to a different video first, the extension redirects to your pick.
- Does nothing when an ad ends.
- The selection resets after moving to a new video.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-NextHover`).

## Notes

- Runs only on `https://www.youtube.com/*` and requests no extra permissions.
- If autoplay wins the race, the redirect is a full page load, so you may see a brief flash.
