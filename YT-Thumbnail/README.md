# YT Thumbnail Peek

Chrome extension that shows the current YouTube video's thumbnail when you hover the small thumbnail button placed at the right side of the video title.

## Install for local testing

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`YT-Thumbnail`).
5. Open a YouTube watch page and hover the small icon beside the title.

## Notes

- The extension runs only on `https://www.youtube.com/*`.
- It derives the thumbnail from the current video ID and tries YouTube's common thumbnail sizes from highest quality to lower quality.
- YouTube changes its page markup often, so the content script watches navigation and DOM updates to reattach itself after in-page route changes.
