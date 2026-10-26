(() => {
  const ANCHOR_CLASS = "yt-thumbnail-peek-anchor";
  const POPOVER_CLASS = "yt-thumbnail-peek-popover";
  const TITLE_ROW_CLASS = "yt-thumbnail-peek-title-row";
  const ATTACHED_ATTR = "data-yt-thumbnail-peek-attached";
  const VIDEO_URL_PATTERN = /\/(?:watch|shorts)\b/;

  let activeVideoId = "";
  let anchor = null;
  let titleRow = null;
  let popover = null;
  let mutationObserver = null;
  let navigationTimer = 0;

  const thumbnailNames = [
    "maxresdefault.jpg",
    "sddefault.jpg",
    "hqdefault.jpg",
    "mqdefault.jpg"
  ];

  function getVideoId() {
    const url = new URL(window.location.href);

    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/);
    return shortsMatch ? shortsMatch[1] : "";
  }

  function getThumbnailUrl(videoId, index = 0) {
    const fileName = thumbnailNames[index] || thumbnailNames[thumbnailNames.length - 1];
    return `https://i.ytimg.com/vi/${videoId}/${fileName}`;
  }

  function findTitleElement() {
    return (
      document.querySelector("ytd-watch-metadata h1 yt-formatted-string") ||
      document.querySelector("ytd-watch-metadata h1") ||
      document.querySelector("#title h1 yt-formatted-string") ||
      document.querySelector("#title h1")
    );
  }

  function createAnchor() {
    const node = document.createElement("button");
    node.type = "button";
    node.className = ANCHOR_CLASS;
    node.setAttribute("aria-label", "Show video thumbnail");
    node.innerHTML = `
      <span class="yt-thumbnail-peek-card" aria-hidden="true">
        <span class="yt-thumbnail-peek-play"></span>
        <span class="yt-thumbnail-peek-shine"></span>
      </span>
    `;
    node.addEventListener("mouseenter", showPopover);
    node.addEventListener("focus", showPopover);
    node.addEventListener("mouseleave", hidePopover);
    node.addEventListener("blur", hidePopover);
    return node;
  }

  function createPopover() {
    const node = document.createElement("div");
    node.className = POPOVER_CLASS;
    node.setAttribute("role", "tooltip");
    node.innerHTML = `
      <div class="yt-thumbnail-peek-popover__shell">
        <img alt="YouTube video thumbnail" />
      </div>
    `;
    document.documentElement.appendChild(node);
    return node;
  }

  function setImageWithFallback(img, videoId, index = 0) {
    img.dataset.thumbnailIndex = String(index);
    img.src = getThumbnailUrl(videoId, index);
  }

  function ensurePopover() {
    if (!popover || !document.documentElement.contains(popover)) {
      popover = createPopover();
      const img = popover.querySelector("img");
      img.addEventListener("error", () => {
        const nextIndex = Number(img.dataset.thumbnailIndex || "0") + 1;
        if (nextIndex < thumbnailNames.length) {
          setImageWithFallback(img, activeVideoId, nextIndex);
        }
      });
    }

    return popover;
  }

  function positionPopover() {
    if (!anchor || !popover) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const margin = 16;
    const width = Math.min(640, window.innerWidth - margin * 2);
    const top = Math.min(rect.bottom + 10, window.innerHeight - (width * 9) / 16 - 52);
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));

    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(margin, top)}px`;
    popover.style.width = `${width}px`;
  }

  function showPopover() {
    activeVideoId = getVideoId();
    if (!activeVideoId) {
      return;
    }

    const node = ensurePopover();
    const img = node.querySelector("img");

    if (img.dataset.videoId !== activeVideoId) {
      img.dataset.videoId = activeVideoId;
      setImageWithFallback(img, activeVideoId);
    }

    positionPopover();
    node.dataset.visible = "true";
  }

  function hidePopover() {
    if (popover) {
      popover.dataset.visible = "false";
    }
  }

  function attachAnchor() {
    const videoId = getVideoId();
    const title = findTitleElement();
    const row = title?.closest("h1") || title;

    if (!VIDEO_URL_PATTERN.test(window.location.pathname) || !videoId || !title) {
      removeAnchor();
      return;
    }

    if (title.getAttribute(ATTACHED_ATTR) === "true" && anchor?.isConnected) {
      return;
    }

    removeAnchor();

    anchor = createAnchor();
    titleRow = row;
    titleRow.classList.add(TITLE_ROW_CLASS);
    title.setAttribute(ATTACHED_ATTR, "true");

    if (title === titleRow) {
      titleRow.append(anchor);
    } else {
      title.insertAdjacentElement("afterend", anchor);
    }
  }

  function removeAnchor() {
    if (anchor) {
      anchor.remove();
      anchor = null;
    }

    if (titleRow) {
      titleRow.classList.remove(TITLE_ROW_CLASS);
      titleRow = null;
    }

    document.querySelectorAll(`[${ATTACHED_ATTR}="true"]`).forEach((node) => {
      node.removeAttribute(ATTACHED_ATTR);
    });

    hidePopover();
  }

  function scheduleAttach() {
    window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(attachAnchor, 150);
  }

  function watchNavigation() {
    window.addEventListener("yt-navigate-finish", scheduleAttach);
    window.addEventListener("popstate", scheduleAttach);
    window.addEventListener("resize", positionPopover);

    mutationObserver = new MutationObserver(scheduleAttach);
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  attachAnchor();
  watchNavigation();
})();
