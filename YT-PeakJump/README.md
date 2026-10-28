# YT Peak Jump

Chrome extension that jumps to the most replayed moments of a YouTube video, the peaks of the graph YouTube draws above the progress bar.

## How it works

- **Option + 1** (Mac) / **Alt + 1** (Windows/Linux) jumps to the highest peak, **+ 2** to the second highest, up to **+ 9**.
- Peaks are ranked by height, so **+ 1** is the single most replayed moment, not the earliest.
- Does nothing on videos without the "Most replayed" graph, or when there are fewer peaks than the number pressed.
- Ignored while typing in search or comment boxes.

YouTube uses bare digits to seek to 0–90% and Ctrl/Cmd + digit switches browser tabs, so the shortcut uses Option/Alt.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder (`YT-PeakJump`).

## Notes

- Runs only on `https://www.youtube.com/*` and requests no extra permissions.
- Reads the graph from the player's `.ytp-heat-map-path` SVG. If YouTube changes its markup, update `src/content.js`.
- On Linux, Chrome also uses Alt + 1–8 to switch tabs, so the shortcut may conflict there.
