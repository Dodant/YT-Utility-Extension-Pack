(() => {
  const STATE = {
    root: null,
    card: null,
    comments: [],
    index: 0,
    lastScanAt: 0,
    scanTimer: null,
    observer: null,
    currentVideoId: "",
    lastAutoCommentId: "",
    lastUserNavigationAt: 0,
    autoTimer: null,
    autoPaused: false,
    drag: null,
    resize: null,
    hiddenEdge: "",
    hiddenForPage: false,
    returnToVideoVisible: false,
    commentLoadAttemptedFor: "",
    commentLoadAttemptedAt: 0,
    commentLoadRestoreTimer: null,
    commentLoadPreviousScroll: null,
    optimisticLikes: new Map(),
    selectingContent: false,
    selectionLockUntil: 0
  };

  const EDGE_HIDE_RATIO = 0.5;
  const EDGE_DRAG_LIMIT_RATIO = 0.68;
  const HIDDEN_PEEK = 34;
  const VIEWPORT_MARGIN = 8;
  const MIN_OVERLAY_WIDTH = 360;
  const MIN_OVERLAY_HEIGHT = 132;
  // Auto-advance dwell time scales with comment length: base + per-character, clamped to 5-8s.
  // <=40 chars floor at 5s, >=100 chars cap at 8s, ramping between.
  const AUTO_ADVANCE_BASE_MS = 3000;
  const AUTO_ADVANCE_MS_PER_CHAR = 50;
  const AUTO_ADVANCE_MIN_MS = 5000;
  const AUTO_ADVANCE_MAX_MS = 8000;
  const COMMENT_LOAD_TIMEOUT_MS = 8000;
  const TIMESTAMP_PATTERN = /\b(?:(?:\d{1,2}:)?\d{1,2}:)\d{2}\b/g;

  const TEXT = {
    previousComment: "Previous comment",
    nextComment: "Next comment",
    commentNavigation: "Comment navigation",
    likeComment: "Like comment",
    openOriginalComment: "Open original comment",
    returnToVideo: "Return to video",
    viewReplies: "View replies",
    focusTitle: "Comment Focus",
    resize: "Resize",
    emptyComments: "Reading comments. Scroll to the comments area once to load more quickly.",
    noPlayableVideo: "This is not a playable video page. Open a video page to use Comment Focus.",
    replyCount: "$1 replies",
    likeCount: "$1 likes",
    videoTimestamp: "Video $1",
    totalComments: "$1 comments",
    unknownAuthor: "Unknown"
  };

  const SELECTORS = {
    player: "#movie_player, ytd-player, #player-container",
    commentsRoot: "ytd-comments#comments, #comments",
    thread: "ytd-comment-thread-renderer",
    standaloneComment: "ytd-comment-view-model, ytd-comment-renderer",
    comment: "ytd-comment-view-model, ytd-comment-renderer",
    content: "#content-text, yt-attributed-string#content-text, .content-text, [id='content-text'], [class*='content-text'], span.yt-core-attributed-string, yt-attributed-string",
    author: "#author-text, #author-name, .author-text, [id='author-text']",
    published: "#published-time-text, .published-time-text, [id='published-time-text']",
    likes: "#vote-count-middle, [id='vote-count-middle'], .vote-count-middle"
  };

  function message(key, substitutions) {
    try {
      const values = Array.isArray(substitutions)
        ? substitutions
        : substitutions === undefined || substitutions === null
          ? []
          : [substitutions];
      const template = String(TEXT[key] || key || "");

      return values.reduce((message, value, index) => (
        message.split(`$${index + 1}`).join(String(value))
      ), template);
    } catch (error) {
      return String(key || "");
    }
  }

  const CHEVRON = (points) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${points}"></polyline></svg>`;

  const UI = {
    root: `
      <div class="ytcf-shell" aria-live="polite">
        <section class="ytcf-card" tabindex="0">
          <div class="ytcf-topbar">
            <div class="ytcf-author-wrap">
              <button class="ytcf-author" type="button" aria-label="${message("openOriginalComment")}" title="${message("openOriginalComment")}"></button>
              <span class="ytcf-time"></span>
            </div>
            <div class="ytcf-topbar-right">
              <span class="ytcf-count"></span>
            </div>
          </div>
          <div class="ytcf-progress" aria-hidden="true">
            <span class="ytcf-progress-fill"></span>
          </div>
          <div class="ytcf-body">
            <span class="ytcf-content"></span>
          </div>
          <div class="ytcf-actions">
            <div class="ytcf-action-group">
              <button class="ytcf-like ytcf-likes" type="button" aria-label="${message("likeComment")}" title="${message("likeComment")}"></button>
              <button class="ytcf-replies" type="button" aria-label="${message("viewReplies")}" title="${message("viewReplies")}"></button>
            </div>
            <div class="ytcf-nav-group" aria-label="${message("commentNavigation")}">
              <button class="ytcf-nav ytcf-return-video" type="button" aria-label="${message("returnToVideo")}" title="${message("returnToVideo")}">${CHEVRON("6 14 12 8 18 14")}</button>
              <button class="ytcf-nav ytcf-prev" type="button" aria-label="${message("previousComment")}" title="${message("previousComment")}">${CHEVRON("15 6 9 12 15 18")}</button>
              <button class="ytcf-nav ytcf-next" type="button" aria-label="${message("nextComment")}" title="${message("nextComment")}">${CHEVRON("9 6 15 12 9 18")}</button>
            </div>
          </div>
          <div class="ytcf-resize-handle" title="${message("resize")}"></div>
        </section>
      </div>
    `
  };

  function init() {
    if (!location.hostname.endsWith("youtube.com")) return;

    updateOverlayVisibility();
    ensureOverlay();
    watchUrlChanges();
    installThemeWatcher();
    installVideoTimeWatcher();
    scheduleScan(250);

    document.addEventListener("fullscreenchange", syncFullscreenParent);
    document.addEventListener("webkitfullscreenchange", syncFullscreenParent);

    STATE.observer = new MutationObserver(() => scheduleScan(500));
    STATE.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function ensureOverlay() {
    if (!isPlayableVideoPage()) {
      updateOverlayVisibility();
      return;
    }

    if (STATE.root && document.contains(STATE.root)) return;

    const player = findPlayerContainer();
    if (!player) {
      setTimeout(ensureOverlay, 500);
      return;
    }

    const root = document.createElement("div");
    root.className = "ytcf-root";
    root.innerHTML = UI.root;
    root.addEventListener("click", handleRootClick);
    root.addEventListener("keydown", handleKeydown);
    root.addEventListener("pointerdown", handleContentSelectionStart);
    root.addEventListener("pointerup", handleContentSelectionEnd);
    root.addEventListener("pointercancel", handleContentSelectionEnd);
    root.addEventListener("pointerdown", handleDragStart);
    root.addEventListener("pointerdown", handleResizeStart);
    root.addEventListener("pointerenter", handleOverlayPointerEnter);
    root.addEventListener("pointerleave", handleOverlayPointerLeave);
    root.addEventListener("dragstart", blockControlTextDrag);
    root.addEventListener("selectstart", blockControlTextDrag);
    document.body.appendChild(root);

    STATE.root = root;
    STATE.card = root.querySelector(".ytcf-card");
    syncFullscreenParent();
    applyOverlayTheme();
    updateOverlayVisibility();
    render();
  }

  // In fullscreen, YouTube renders only the player element (top layer); an overlay
  // parented to <body> is not painted. Re-parent it into the fullscreen element while
  // active, and back to <body> when it exits, so comments stay visible in fullscreen.
  function currentFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function syncFullscreenParent() {
    if (!STATE.root) return;

    const fs = currentFullscreenElement();
    if (fs) {
      // Only move if the overlay isn't already inside the fullscreen subtree
      // (e.g. when the document element itself goes fullscreen, <body> is fine).
      if (!fs.contains(STATE.root)) fs.appendChild(STATE.root);
    } else if (STATE.root.parentElement !== document.body) {
      document.body.appendChild(STATE.root);
    }
  }

  function findPlayerContainer() {
    return document.querySelector("#movie_player") ||
      document.querySelector("ytd-player") ||
      document.querySelector("#player-container");
  }

  function installThemeWatcher() {
    applyOverlayTheme();
    setInterval(applyOverlayTheme, 1000);
  }

  function applyOverlayTheme() {
    if (!STATE.root) return;
    STATE.root.dataset.theme = isYouTubeDarkMode() ? "default" : "inverted";
  }

  function updateOverlayVisibility() {
    const playable = isPlayableVideoPage();
    STATE.hiddenForPage = !playable;

    if (!playable) {
      STATE.comments = [];
      STATE.index = 0;
      STATE.lastAutoCommentId = "";
      STATE.returnToVideoVisible = false;
      clearAutoAdvance();
      STATE.root?.classList.add("ytcf-hidden");
      return false;
    }

    STATE.root?.classList.remove("ytcf-hidden");
    return true;
  }

  function isYouTubeDarkMode() {
    return document.documentElement.hasAttribute("dark") ||
      document.body?.hasAttribute("dark") ||
      Boolean(document.querySelector("ytd-app[dark], ytd-app[is-dark-theme], html[dark]"));
  }

  function watchUrlChanges() {
    let last = location.href;
    setInterval(() => {
      if (last === location.href) return;
      last = location.href;
      const nextVideoId = getVideoId();
      if (nextVideoId !== STATE.currentVideoId) {
        STATE.currentVideoId = nextVideoId;
        STATE.comments = [];
        STATE.index = 0;
        STATE.lastAutoCommentId = "";
        STATE.returnToVideoVisible = false;
        STATE.commentLoadAttemptedFor = "";
        STATE.commentLoadAttemptedAt = 0;
        STATE.commentLoadPreviousScroll = null;
        STATE.autoPaused = false;
        clearAutoAdvance();
      }
      updateOverlayVisibility();
      ensureOverlay();
      scheduleScan(300);
    }, 500);
  }

  function scheduleScan(delay) {
    clearTimeout(STATE.scanTimer);
    STATE.scanTimer = setTimeout(scanComments, delay);
  }

  function scanComments() {
    STATE.lastScanAt = Date.now();
    if (!updateOverlayVisibility()) return;

    ensureOverlay();

    const root = findCommentsRoot();
    const scanRoot = root || document;
    const units = getCommentUnits(scanRoot);
    const comments = units
      .map(toCommentData)
      .filter(Boolean)
      .filter((comment, index, array) => array.findIndex((item) => item.id === comment.id) === index);

    const previousId = currentComment()?.id;
    STATE.comments = comments;

    if (previousId) {
      const nextIndex = comments.findIndex((comment) => comment.id === previousId);
      STATE.index = nextIndex >= 0 ? nextIndex : Math.min(STATE.index, comments.length - 1);
    } else {
      STATE.index = Math.min(STATE.index, Math.max(0, comments.length - 1));
    }

    render();
    if (comments.length) {
      scheduleAutoAdvance();
    } else {
      requestCommentsLoad(root);
      scheduleScan(1500);
    }
  }

  function findCommentsRoot() {
    const candidates = [
      ...queryAll(document, "ytd-comments#comments, ytd-comments, #comments, ytd-item-section-renderer")
    ];
    return candidates.find((candidate) => getCommentUnits(candidate).length > 0) ||
      queryOne(document, "ytd-comments#comments, ytd-comments") ||
      queryOne(document, "#comments");
  }

  function requestCommentsLoad(root) {
    const videoId = getVideoId() || location.href;
    if (STATE.commentLoadAttemptedFor === videoId && Date.now() - STATE.commentLoadAttemptedAt < 5000) return;

    STATE.commentLoadAttemptedFor = videoId;
    STATE.commentLoadAttemptedAt = Date.now();
    STATE.commentLoadPreviousScroll = { x: window.scrollX, y: window.scrollY };

    const targetTop = getCommentLoadScrollTop(root);
    window.scrollTo({
      left: window.scrollX,
      top: targetTop,
      behavior: "auto"
    });
    setTimeout(() => {
      if (STATE.comments.length || STATE.commentLoadPreviousScroll === null) return;
      window.scrollTo({ left: window.scrollX, top: targetTop + 420, behavior: "auto" });
      window.dispatchEvent(new Event("scroll"));
    }, 450);
    setTimeout(() => {
      if (STATE.comments.length || STATE.commentLoadPreviousScroll === null) return;
      window.scrollTo({ left: window.scrollX, top: targetTop, behavior: "auto" });
      window.dispatchEvent(new Event("scroll"));
    }, 1100);

    clearTimeout(STATE.commentLoadRestoreTimer);
    waitForCommentsThenRestore(Date.now());
  }

  function getCommentLoadScrollTop(root) {
    const target = root || queryOne(document, "ytd-comments#comments, ytd-comments, #comments");
    if (target) {
      return Math.max(0, window.scrollY + target.getBoundingClientRect().top - 80);
    }

    const player = findPlayerContainer();
    const playerBottom = player
      ? window.scrollY + player.getBoundingClientRect().bottom
      : window.innerHeight;
    return Math.max(window.innerHeight, playerBottom + Math.round(window.innerHeight * 0.45));
  }

  function waitForCommentsThenRestore(startedAt) {
    const root = findCommentsRoot();
    const foundComments = root && getCommentUnits(root).length > 0;
    const timedOut = Date.now() - startedAt > COMMENT_LOAD_TIMEOUT_MS;

    if (foundComments || timedOut) {
      restoreCommentLoadScroll();
      scheduleScan(100);
      return;
    }

    STATE.commentLoadRestoreTimer = setTimeout(() => {
      waitForCommentsThenRestore(startedAt);
    }, 250);
  }

  function restoreCommentLoadScroll() {
    const previous = STATE.commentLoadPreviousScroll;
    if (!previous) return;

    window.scrollTo({ left: previous.x, top: previous.y, behavior: "auto" });
    STATE.commentLoadPreviousScroll = null;
  }

  function maybeLoadMoreComments() {
    if (!STATE.comments.length) return;
    if (STATE.index < STATE.comments.length - 3) return;
    loadMoreComments();
  }

  function loadMoreComments() {
    if (Date.now() - STATE.commentLoadAttemptedAt < 2500) return;
    if (!findCommentContinuation()) return;

    STATE.commentLoadAttemptedAt = Date.now();
    STATE.commentLoadPreviousScroll = { x: window.scrollX, y: window.scrollY };

    // YouTube only fetches the next batch when its bottom sentinel enters view via a
    // real scroll delta. Bounce to the bottom to trip it, stay until the batch lands,
    // then restore the user's original scroll position.
    bounceToCommentsBottom();
    clearTimeout(STATE.commentLoadRestoreTimer);
    waitForMoreThenRestore(Date.now(), countLoadedComments());
  }

  function waitForMoreThenRestore(startedAt, before) {
    const grew = countLoadedComments() > before;
    const timedOut = Date.now() - startedAt > COMMENT_LOAD_TIMEOUT_MS;

    if (grew || timedOut) {
      restoreCommentLoadScroll();
      scheduleScan(100);
      return;
    }

    bounceToCommentsBottom();
    STATE.commentLoadRestoreTimer = setTimeout(() => {
      waitForMoreThenRestore(startedAt, before);
    }, 250);
  }

  function bounceToCommentsBottom() {
    const scroller = document.scrollingElement || document.documentElement;
    window.scrollTo(0, Math.max(0, scroller.scrollHeight - 1200));
    window.scrollTo(0, scroller.scrollHeight);
    window.dispatchEvent(new Event("scroll"));
  }

  function countLoadedComments() {
    return queryAll(document, SELECTORS.thread).length;
  }

  function findCommentContinuation() {
    return queryOne(document, "ytd-comments ytd-continuation-item-renderer, #comments ytd-continuation-item-renderer");
  }

  function getCommentUnits(root) {
    const threads = queryAll(root, SELECTORS.thread)
      .filter(isTopLevelCommentThread);
    const standalone = queryAll(root, SELECTORS.standaloneComment)
      .filter(isTopLevelStandaloneComment)
      .filter((comment) => !closestMatch(comment, SELECTORS.thread));
    const contentBacked = getContentBackedCommentUnits(root);

    return uniqueElements([...threads, ...standalone, ...contentBacked])
      .filter(isLikelyCommentUnit);
  }

  function getContentBackedCommentUnits(root) {
    return queryAll(root, "#content-text, yt-attributed-string#content-text, [id='content-text']")
      .map((content) => closestMatch(content, [
        "ytd-comment-thread-renderer",
        "ytd-comment-view-model",
        "ytd-comment-renderer"
      ].join(",")))
      .filter(Boolean)
      .filter((unit) => !closestMatch(unit, "ytd-comment-replies-renderer, ytd-comment-replies-header-renderer"));
  }

  function uniqueElements(elements) {
    return [...new Set(elements.filter(Boolean))];
  }

  function isLikelyCommentUnit(unit) {
    const node = getPrimaryCommentNode(unit);
    if (!node) return false;
    if (!getCommentContent(node)) return false;

    return Boolean(getFirstText(node, SELECTORS.author)) ||
      Boolean(getFirstText(node, SELECTORS.published)) ||
      matchesSelector(unit, SELECTORS.thread) ||
      matchesSelector(unit, SELECTORS.standaloneComment);
  }

  function queryOne(root, selector) {
    if (!root) return null;

    try {
      return root.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function queryAll(root, selector) {
    if (!root) return [];

    try {
      return [...root.querySelectorAll(selector)];
    } catch (error) {
      return [];
    }
  }

  function closestMatch(element, selector) {
    if (!element) return null;

    try {
      return element.closest(selector);
    } catch (error) {
      return null;
    }
  }

  function matchesSelector(element, selector) {
    if (!element) return false;

    try {
      return element.matches(selector);
    } catch (error) {
      return false;
    }
  }

  function closestEventTarget(event, selector) {
    return closestMatch(getEventElement(event), selector);
  }

  function getEventElement(event) {
    const target = event?.target;
    if (!target) return null;
    if (typeof target.closest === "function") return target;
    if (target.parentElement) return target.parentElement;
    if (target.parentNode && typeof target.parentNode.closest === "function") return target.parentNode;
    return null;
  }

  function toCommentData(unit) {
    const node = getPrimaryCommentNode(unit);
    if (!node) return null;

    const content = getCommentContent(node);
    if (!content) return null;

    const author = normalizeText(getFirstText(node, SELECTORS.author)) || message("unknownAuthor");
    const verifiedAuthor = isVerifiedAuthor(node);
    const timeLabel = normalizePublishedTimeLabel(getFirstText(node, SELECTORS.published));
    const likes = normalizeText(getFirstText(node, SELECTORS.likes)) || "0";
    const replyCountLabel = getReplyCountLabel(unit);
    const timestamps = extractTimestamps(content);
    const id = unit.getAttribute("data-cid") ||
      node.getAttribute("data-id") ||
      queryOne(node, "a[href*='lc=']")?.href ||
      `${author}|${timeLabel}|${content.slice(0, 80)}`;

    return {
      id,
      author,
      verifiedAuthor,
      timeLabel,
      content,
      likes,
      replyCountLabel,
      timestamps,
      node,
      thread: unit
    };
  }

  function isTopLevelCommentThread(thread) {
    return !closestMatch(thread, "ytd-comment-replies-renderer, #replies");
  }

  function isTopLevelStandaloneComment(comment) {
    return !closestMatch(comment, "ytd-comment-replies-renderer, #replies, ytd-comment-replies-header-renderer");
  }

  function getPrimaryCommentNode(unit) {
    if (matchesSelector(unit, SELECTORS.standaloneComment)) return unit;

    const container = queryOne(unit, ":scope > #comment");
    return queryOne(container, SELECTORS.comment) ||
      queryOne(unit, ":scope > ytd-comment-view-model, :scope > ytd-comment-renderer") ||
      queryOne(unit, "#comment ytd-comment-view-model, #comment ytd-comment-renderer") ||
      queryOne(unit, SELECTORS.comment) ||
      container ||
      null;
  }

  function getFirstText(root, selector) {
    const el = queryOne(root, selector);
    return getElementText(el);
  }

  function getElementText(element) {
    if (!element) return "";
    return element.innerText ||
      element.textContent ||
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      "";
  }

  function getCommentContent(node) {
    const exact = queryOne(node, "#content-text, yt-attributed-string#content-text, [id='content-text']");
    const exactText = normalizeCommentContent(getElementText(exact));
    if (exactText) return exactText;

    const candidates = queryAll(node, SELECTORS.content)
      .map((el) => normalizeCommentContent(getElementText(el)))
      .filter(Boolean)
      .filter((text) => text !== normalizeText(getFirstText(node, SELECTORS.author)))
      .filter((text) => !parseRelativeTimeLabel(normalizeText(text)));

    return candidates.sort((a, b) => b.length - a.length)[0] || "";
  }

  function isVerifiedAuthor(thread) {
    const badge = queryOne(thread, [
      "ytd-badge-supported-renderer",
      "badge-shape",
      "yt-icon[icon*='CHECK']",
      "yt-icon[icon*='VERIFIED']",
      "[aria-label*='Verified']",
      "[aria-label*='인증']",
      "[title*='Verified']",
      "[title*='인증']"
    ].join(","));
    if (badge) return true;

    const badgeText = normalizeText([
      queryOne(thread, "#author-comment-badge")?.outerHTML || "",
      ...queryAll(thread, "[class*='badge'], [class*='Badge'], [class*='verified'], [class*='Verified']")
        .map((el) => `${el.className || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`)
    ].join(" ")).toLowerCase();

    return /verified|인증|badge_style_type_verified|official/.test(badgeText);
  }

  function getReplyCountLabel(thread) {
    const candidates = queryAll(thread, "button, yt-button-shape button, [role='button']")
      .map((button) => normalizeText(`${button.innerText || ""} ${button.getAttribute("aria-label") || ""}`))
      .filter(Boolean);

    for (const text of candidates) {
      const count = parseReplyCount(text);
      if (count !== null) return message("replyCount", formatCount(count));
    }

    return "";
  }

  function parseReplyCount(text) {
    const lowerText = text.toLowerCase();
    if (!/(reply|replies|답글)/.test(lowerText)) return null;
    if (/^reply$|^답글$/.test(lowerText.trim())) return null;

    const compactMatch = text.match(/([\d,.]+)\s*(천|만|억|k|m|b)?/i);
    if (!compactMatch) return null;

    const number = Number(compactMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(number)) return null;

    const unit = compactMatch[2]?.toLowerCase();
    const multiplier = unit === "천" || unit === "k"
      ? 1000
      : unit === "만"
        ? 10000
        : unit === "억"
          ? 100000000
          : unit === "m"
            ? 1000000
            : unit === "b"
              ? 1000000000
              : 1;
    return Math.round(number * multiplier);
  }

  function formatCount(value) {
    return value.toLocaleString("en-US");
  }

  function normalizeText(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function normalizeCommentContent(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizePublishedTimeLabel(value) {
    const text = normalizeText(value);
    if (!text) return "";

    const relative = parseRelativeTimeLabel(text);
    if (!relative) return text;

    return formatRelativeTimeLabel(relative);
  }

  function parseRelativeTimeLabel(text) {
    const koreanJustNow = /^(방금\s*전|지금)$/i;
    if (koreanJustNow.test(text)) return { value: 0, unit: "second" };

    const koreanMatch = text.match(/(\d+)\s*(년|개월|달|주|일|시간|분|초)\s*전/);
    if (koreanMatch) {
      return {
        value: Number(koreanMatch[1]),
        unit: koreanRelativeUnitToKey(koreanMatch[2])
      };
    }

    const englishJustNow = /^(just now|now)$/i;
    if (englishJustNow.test(text)) return { value: 0, unit: "second" };

    const englishMatch = text.match(/(\d+)\s*(year|month|week|day|hour|minute|second)s?\s*ago/i);
    if (englishMatch) {
      return {
        value: Number(englishMatch[1]),
        unit: englishMatch[2].toLowerCase()
      };
    }

    return null;
  }

  function koreanRelativeUnitToKey(unit) {
    if (unit === "년") return "year";
    if (unit === "개월" || unit === "달") return "month";
    if (unit === "주") return "week";
    if (unit === "일") return "day";
    if (unit === "시간") return "hour";
    if (unit === "분") return "minute";
    return "second";
  }

  function formatRelativeTimeLabel(relative) {
    if (relative.value === 0) return "just now";
    const unit = relative.value === 1 ? relative.unit : `${relative.unit}s`;
    return `${relative.value} ${unit} ago`;
  }

  function extractTimestamps(text) {
    const matches = text.match(TIMESTAMP_PATTERN) || [];
    return [...new Set(matches)]
      .map((label) => ({ label, seconds: timestampToSeconds(label) }))
      .filter((item) => Number.isFinite(item.seconds));
  }

  function timestampToSeconds(label) {
    return label.split(":")
      .map(Number)
      .reduce((total, part) => total * 60 + part, 0);
  }

  function currentComment() {
    return STATE.comments[STATE.index] || null;
  }

  function render() {
    if (!STATE.root) return;

    const previousBottom = getRootBottomAnchor();
    const comment = currentComment();
    STATE.root.dataset.returnVisible = String(STATE.returnToVideoVisible);

    if (!comment) {
      if (!STATE.root.querySelector(".ytcf-author")) {
        STATE.root.innerHTML = UI.root;
      }
      STATE.root.dataset.empty = "true";
      setText(".ytcf-author", message("focusTitle"));
      setText(".ytcf-time", "");
      renderPlainCommentContent(getEmptyStateMessage());
      setMetricLabel(".ytcf-likes", "");
      setMetricLabel(".ytcf-replies", "");
      setMetricLabel(".ytcf-count", "");
      clearAutoAdvance();
      preserveBottomAnchor(previousBottom);
      return;
    }

    if (!STATE.root.querySelector(".ytcf-author")) {
      STATE.root.innerHTML = UI.root;
    }

    STATE.root.dataset.empty = "false";
    setText(".ytcf-author", comment.author);
    STATE.root.querySelector(".ytcf-author")?.classList.toggle("ytcf-author-verified", Boolean(comment.verifiedAuthor));
    setText(".ytcf-time", comment.timeLabel);
    renderCommentContent(comment);
    const likeState = getCommentLikeState(comment);
    setMetricLabel(".ytcf-likes", message("likeCount", likeState.likesLabel));
    setMetricLabel(".ytcf-replies", comment.replyCountLabel);
    setMetricLabel(".ytcf-count", getTotalCommentCountLabel());

    const likeButton = STATE.root.querySelector(".ytcf-like");
    likeButton.setAttribute("aria-pressed", String(likeState.liked));
    likeButton.dataset.pending = String(likeState.pending);
    preserveBottomAnchor(previousBottom);
  }

  function setText(selector, value) {
    const el = STATE.root?.querySelector(selector);
    if (el) el.textContent = value || "";
  }

  function getEmptyStateMessage() {
    if (!isPlayableVideoPage()) return message("noPlayableVideo");
    return message("emptyComments");
  }

  function renderCommentContent(comment) {
    const el = STATE.root?.querySelector(".ytcf-content");
    if (!el) return;
    if (shouldPreserveCommentSelection(comment)) return;

    const renderKey = getCommentRenderKey(comment);
    if (el.dataset.renderKey === renderKey) return;

    el.textContent = "";
    el.dataset.renderKey = renderKey;
    const parts = comment.content.split(TIMESTAMP_PATTERN);
    const matches = comment.content.match(TIMESTAMP_PATTERN) || [];

    parts.forEach((part, index) => {
      if (part) el.appendChild(document.createTextNode(part));

      const timestamp = matches[index];
      if (!timestamp) return;

      const chip = document.createElement("button");
      chip.className = "ytcf-timecode";
      chip.type = "button";
      chip.dataset.seconds = String(timestampToSeconds(timestamp));
      chip.textContent = timestamp;
      chip.title = message("videoTimestamp", timestamp);
      el.appendChild(chip);
    });
  }

  function renderPlainCommentContent(message) {
    const el = STATE.root?.querySelector(".ytcf-content");
    if (!el) return;
    const renderKey = `plain|${message || ""}`;
    if (el.dataset.renderKey === renderKey) return;
    el.textContent = message || "";
    el.dataset.renderKey = renderKey;
  }

  function getCommentRenderKey(comment) {
    return `${comment.id}|${comment.content}`;
  }

  function shouldPreserveCommentSelection(comment) {
    if (!comment) return false;
    if (STATE.selectingContent) return true;
    if (Date.now() < STATE.selectionLockUntil) return true;

    const content = STATE.root?.querySelector(".ytcf-content");
    const selection = document.getSelection?.();
    if (!content || !selection || selection.isCollapsed || selection.rangeCount === 0) return false;

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      if (rangeIntersectsNode(range, content)) {
        STATE.selectionLockUntil = Date.now() + 1200;
        return true;
      }
    }

    return false;
  }

  function rangeIntersectsNode(range, node) {
    try {
      return range.intersectsNode(node);
    } catch (error) {
      return node.contains(range.commonAncestorContainer);
    }
  }

  function handleContentSelectionStart(event) {
    if (!closestEventTarget(event, ".ytcf-content")) return;
    if (closestEventTarget(event, ".ytcf-timecode")) return;

    STATE.selectingContent = true;
    STATE.selectionLockUntil = Date.now() + 3000;
    document.addEventListener("pointerup", handleContentSelectionEnd, { once: true });
    document.addEventListener("pointercancel", handleContentSelectionEnd, { once: true });
    pauseAutoAdvance();
  }

  function handleContentSelectionEnd() {
    if (!STATE.selectingContent) return;

    STATE.selectingContent = false;
    STATE.selectionLockUntil = Date.now() + 3000;
  }

  function clearContentSelectionLock() {
    STATE.selectingContent = false;
    STATE.selectionLockUntil = 0;
    document.getSelection?.()?.removeAllRanges?.();
  }

  function setLabel(selector, value) {
    const el = STATE.root?.querySelector(selector);
    if (!el) return;
    el.textContent = "";
    el.dataset.label = value || "";
  }

  function setMetricLabel(selector, value) {
    const el = STATE.root?.querySelector(selector);
    if (!el) return;

    el.textContent = "";
    delete el.dataset.label;

    if (!value) {
      el.dataset.label = "";
      return;
    }

    const parts = String(value).split(/(\d[\d,.]*(?:\s?(?:천|만|억|K|M|B|k|m|b))?)/g);
    parts.forEach((part) => {
      if (!part) return;

      if (/^\d/.test(part)) {
        const number = document.createElement("span");
        number.className = "ytcf-metric-number";
        number.textContent = part;
        el.appendChild(number);
      } else {
        const text = document.createElement("span");
        text.className = "ytcf-metric-text";
        text.textContent = part.replace(/ /g, "\u00a0");
        el.appendChild(text);
      }
    });
  }

  function getTotalCommentCountLabel() {
    const countEl = document.querySelector([
      "ytd-comments-header-renderer #count",
      "ytd-comments-header-renderer #count yt-formatted-string",
      "ytd-comments-header-renderer .count-text",
      "#comments #count"
    ].join(","));
    const rawText = normalizeText(countEl?.innerText || countEl?.textContent || "");
    const countText = normalizeTotalCommentCount(rawText);
    return countText ? message("totalComments", countText) : "";
  }

  function normalizeTotalCommentCount(text) {
    const withoutLabel = text
      .replace(/^댓글\s*/i, "")
      .replace(/\bcomments?\b/gi, "")
      .trim();
    const compactMatch = withoutLabel.match(/([\d,.]+)\s*(천|만|억|k|m|b)?\s*개?/i);
    if (!compactMatch) return withoutLabel.replace(/\s*개$/i, "").trim();

    const number = Number(compactMatch[1].replace(/,/g, ""));
    const unit = compactMatch[2]?.toLowerCase();
    if (!Number.isFinite(number)) return withoutLabel.replace(/\s*개$/i, "").trim();

    const multiplier = unit === "천" || unit === "k"
      ? 1000
      : unit === "만"
        ? 10000
        : unit === "억"
          ? 100000000
          : unit === "m"
            ? 1000000
            : unit === "b"
              ? 1000000000
              : 1;

    return formatCount(Math.round(number * multiplier));
  }

  function handleKeydown(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    event.preventDefault();
    event.stopPropagation();
    navigate(event.key === "ArrowLeft" ? -1 : 1);
    scheduleAutoAdvance(true);
  }

  function handleRootClick(event) {
    const timecode = closestEventTarget(event, ".ytcf-timecode");
    if (timecode) {
      pauseAutoAdvance();
      seekToTimecode(timecode);
      return;
    }

    const button = closestEventTarget(event, "button");
    if (!button) return;

    if (button.classList.contains("ytcf-prev")) {
      pauseAutoAdvance();
      navigate(-1);
    } else if (button.classList.contains("ytcf-next")) {
      pauseAutoAdvance();
      navigate(1);
    } else if (button.classList.contains("ytcf-return-video")) {
      pauseAutoAdvance();
      returnToVideo();
    } else if (button.classList.contains("ytcf-like")) {
      pauseAutoAdvance();
      likeCurrentComment();
    } else if (button.classList.contains("ytcf-author")) {
      pauseAutoAdvance();
      revealCurrentComment(false);
    } else if (button.classList.contains("ytcf-replies")) {
      pauseAutoAdvance();
      revealCurrentComment(true);
    }
  }

  function seekToTimecode(timecode) {
    const seconds = Number(timecode.dataset.seconds);
    if (!Number.isFinite(seconds)) return;

    const player = document.querySelector("#movie_player");
    try {
      player?.seekTo?.(seconds, true);
    } catch (error) {
      // Fall back to the native video element below.
    }

    const video = document.querySelector("video.html5-main-video, video");
    if (video) video.currentTime = seconds;
  }

  function blockControlTextDrag(event) {
    if (!closestEventTarget(event, ".ytcf-actions")) return;
    event.preventDefault();
  }

  function handleResizeStart(event) {
    if (!closestEventTarget(event, ".ytcf-resize-handle")) return;
    if (event.button !== undefined && event.button !== 0) return;

    pauseAutoAdvance();
    revealHiddenOverlay();
    const rect = STATE.root.getBoundingClientRect();
    setRootPosition(rect.left, rect.top);

    STATE.resize = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };

    STATE.hiddenEdge = "";
    delete STATE.root.dataset.hiddenEdge;
    STATE.root.dataset.resizing = "true";
    STATE.root.setPointerCapture?.(event.pointerId);
    STATE.root.addEventListener("pointermove", handleResizeMove);
    STATE.root.addEventListener("pointerup", handleResizeEnd);
    STATE.root.addEventListener("pointercancel", handleResizeEnd);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleResizeMove(event) {
    if (!STATE.resize || STATE.resize.pointerId !== event.pointerId) return;

    const rect = STATE.root.getBoundingClientRect();
    const maxWidth = window.innerWidth - rect.left - VIEWPORT_MARGIN;
    const maxHeight = window.innerHeight - rect.top - VIEWPORT_MARGIN;
    const width = clamp(
      STATE.resize.startWidth + event.clientX - STATE.resize.startX,
      MIN_OVERLAY_WIDTH,
      Math.max(MIN_OVERLAY_WIDTH, maxWidth)
    );
    const height = clamp(
      STATE.resize.startHeight + event.clientY - STATE.resize.startY,
      MIN_OVERLAY_HEIGHT,
      Math.max(MIN_OVERLAY_HEIGHT, maxHeight)
    );

    STATE.root.style.width = `${width}px`;
    STATE.root.style.height = `${height}px`;
  }

  function handleResizeEnd(event) {
    if (!STATE.resize || STATE.resize.pointerId !== event.pointerId) return;

    STATE.root.releasePointerCapture?.(event.pointerId);
    STATE.root.removeEventListener("pointermove", handleResizeMove);
    STATE.root.removeEventListener("pointerup", handleResizeEnd);
    STATE.root.removeEventListener("pointercancel", handleResizeEnd);
    delete STATE.root.dataset.resizing;
    STATE.resize = null;
  }

  function handleDragStart(event) {
    if (!closestEventTarget(event, ".ytcf-topbar")) return;
    if (closestEventTarget(event, "button")) return;
    if (event.button !== undefined && event.button !== 0) return;

    pauseAutoAdvance();
    revealHiddenOverlay();
    const rect = STATE.root.getBoundingClientRect();
    STATE.drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    STATE.hiddenEdge = "";
    delete STATE.root.dataset.hiddenEdge;
    STATE.root.dataset.dragging = "true";
    STATE.root.setPointerCapture?.(event.pointerId);
    STATE.root.addEventListener("pointermove", handleDragMove);
    STATE.root.addEventListener("pointerup", handleDragEnd);
    STATE.root.addEventListener("pointercancel", handleDragEnd);
    event.preventDefault();
  }

  function handleDragMove(event) {
    if (!STATE.drag || STATE.drag.pointerId !== event.pointerId) return;

    const rect = STATE.root.getBoundingClientRect();
    const minLeft = -rect.width * EDGE_DRAG_LIMIT_RATIO;
    const maxLeft = window.innerWidth - rect.width * (1 - EDGE_DRAG_LIMIT_RATIO);
    const minTop = -rect.height * EDGE_DRAG_LIMIT_RATIO;
    const maxTop = window.innerHeight - rect.height * (1 - EDGE_DRAG_LIMIT_RATIO);
    const left = clamp(event.clientX - STATE.drag.offsetX, minLeft, maxLeft);
    const top = clamp(event.clientY - STATE.drag.offsetY, minTop, maxTop);

    setRootPosition(left, top);
  }

  function handleDragEnd(event) {
    if (!STATE.drag || STATE.drag.pointerId !== event.pointerId) return;

    STATE.root.releasePointerCapture?.(event.pointerId);
    STATE.root.removeEventListener("pointermove", handleDragMove);
    STATE.root.removeEventListener("pointerup", handleDragEnd);
    STATE.root.removeEventListener("pointercancel", handleDragEnd);
    delete STATE.root.dataset.dragging;
    STATE.drag = null;
    hideOverlayIfHalfOffscreen();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setRootPosition(left, top) {
    STATE.root.style.left = `${left}px`;
    STATE.root.style.top = `${top}px`;
    STATE.root.style.right = "auto";
    STATE.root.style.bottom = "auto";
  }

  function getRootBottomAnchor() {
    if (!STATE.root) return null;
    if (STATE.drag || STATE.resize) return null;
    if (STATE.hiddenEdge && isRootOffscreen()) return { hiddenEdge: STATE.hiddenEdge };

    const rect = STATE.root.getBoundingClientRect();
    const hasManualTop = Boolean(STATE.root.style.top);
    return hasManualTop ? rect.bottom : null;
  }

  function preserveBottomAnchor(anchor) {
    if (!anchor || !STATE.root) return;
    if (STATE.drag || STATE.resize) return;
    if (anchor.hiddenEdge) {
      applyHiddenPosition(anchor.hiddenEdge);
      return;
    }

    const rect = STATE.root.getBoundingClientRect();
    const left = clamp(rect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const top = clamp(anchor - rect.height, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    setRootPosition(left, top);
  }

  function isRootOffscreen() {
    const rect = STATE.root.getBoundingClientRect();
    return rect.left < 0 ||
      rect.top < 0 ||
      rect.right > window.innerWidth ||
      rect.bottom > window.innerHeight;
  }

  function hideOverlayIfHalfOffscreen() {
    if (!STATE.root) return;

    const rect = STATE.root.getBoundingClientRect();
    const overlaps = [
      ["left", Math.max(0, -rect.left) / rect.width],
      ["right", Math.max(0, rect.right - window.innerWidth) / rect.width],
      ["top", Math.max(0, -rect.top) / rect.height],
      ["bottom", Math.max(0, rect.bottom - window.innerHeight) / rect.height]
    ];
    const [edge, overlapRatio] = overlaps.sort((a, b) => b[1] - a[1])[0];
    if (overlapRatio + 0.01 < EDGE_HIDE_RATIO) {
      keepOverlayInViewport();
      return;
    }

    STATE.hiddenEdge = edge;
    STATE.root.dataset.hiddenEdge = edge;
    applyHiddenPosition(edge);
  }

  function keepOverlayInViewport() {
    const rect = STATE.root.getBoundingClientRect();
    const left = clamp(rect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const top = clamp(rect.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    setRootPosition(left, top);
  }

  function applyHiddenPosition(edge) {
    const rect = STATE.root.getBoundingClientRect();
    const visibleLeft = clamp(rect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const visibleTop = clamp(rect.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));

    if (edge === "left") {
      setRootPosition(-(rect.width - HIDDEN_PEEK), visibleTop);
    } else if (edge === "right") {
      setRootPosition(window.innerWidth - HIDDEN_PEEK, visibleTop);
    } else if (edge === "top") {
      setRootPosition(visibleLeft, -(rect.height - HIDDEN_PEEK));
    } else if (edge === "bottom") {
      setRootPosition(visibleLeft, window.innerHeight - HIDDEN_PEEK);
    }
  }

  function revealHiddenOverlay() {
    if (!STATE.hiddenEdge || !STATE.root) return;
    if (STATE.drag || STATE.resize) return;

    const rect = STATE.root.getBoundingClientRect();
    const edge = STATE.hiddenEdge;
    const left = edge === "left"
      ? VIEWPORT_MARGIN
      : edge === "right"
        ? window.innerWidth - rect.width - VIEWPORT_MARGIN
        : clamp(rect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const top = edge === "top"
      ? VIEWPORT_MARGIN
      : edge === "bottom"
        ? window.innerHeight - rect.height - VIEWPORT_MARGIN
        : clamp(rect.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));

    setRootPosition(left, top);
  }

  function hideOverlayAgain() {
    if (!STATE.hiddenEdge || STATE.drag || STATE.resize) return;
    applyHiddenPosition(STATE.hiddenEdge);
  }

  function handleOverlayPointerEnter() {
    if (STATE.drag || STATE.resize) return;
    revealHiddenOverlay();
    pauseAutoAdvance();
  }

  function handleOverlayPointerLeave() {
    hideOverlayAgain();
    resumeAutoAdvance();
  }

  function resumeAutoAdvance() {
    if (STATE.selectingContent || Date.now() < STATE.selectionLockUntil) return;
    STATE.autoPaused = false;
    scheduleAutoAdvance(true);
  }

  function scheduleAutoAdvance(reset = false) {
    if (STATE.autoTimer && !reset) return;
    clearAutoAdvance();
    if (STATE.autoPaused || STATE.hiddenForPage || STATE.comments.length < 2) return;

    const duration = autoAdvanceDuration();
    STATE.root?.style.setProperty("--ytcf-auto-duration", `${duration}ms`);
    STATE.autoTimer = setTimeout(() => {
      advanceAutoComment();
    }, duration);
    setAutoProgressActive(true, true);
  }

  function autoAdvanceDuration() {
    const length = currentComment()?.content.length || 0;
    return clamp(
      AUTO_ADVANCE_BASE_MS + length * AUTO_ADVANCE_MS_PER_CHAR,
      AUTO_ADVANCE_MIN_MS,
      AUTO_ADVANCE_MAX_MS
    );
  }

  function clearAutoAdvance() {
    clearTimeout(STATE.autoTimer);
    STATE.autoTimer = null;
    setAutoProgressActive(false);
  }

  function setAutoProgressActive(active, restart = false) {
    if (!STATE.root) return;

    STATE.root.dataset.autoAdvance = String(active);

    const progress = STATE.root.querySelector(".ytcf-progress-fill");
    if (!progress) return;

    if (!active) {
      progress.style.animation = "none";
      return;
    }

    if (restart) {
      progress.style.animation = "none";
      void progress.offsetWidth;
    }
    progress.style.animation = "";
  }

  function pauseAutoAdvance() {
    STATE.autoPaused = true;
    clearAutoAdvance();
  }

  function advanceAutoComment() {
    if (STATE.autoPaused || STATE.hiddenForPage || STATE.comments.length < 2) return;

    STATE.index = (STATE.index + 1) % STATE.comments.length;
    render();
    maybeLoadMoreComments();
    scheduleAutoAdvance(true);
  }

  function navigate(direction) {
    if (!STATE.comments.length) return;
    clearContentSelectionLock();
    STATE.index = (STATE.index + direction + STATE.comments.length) % STATE.comments.length;
    STATE.lastUserNavigationAt = Date.now();
    render();
    maybeLoadMoreComments();
  }

  function likeCurrentComment() {
    const comment = currentComment();
    if (!comment) return;

    const previousState = getCommentLikeState(comment);
    const optimisticState = {
      liked: !previousState.liked,
      likesLabel: adjustLikeLabel(previousState.likesLabel, previousState.liked ? -1 : 1),
      pending: true
    };
    STATE.optimisticLikes.set(comment.id, optimisticState);
    render();

    const likeButton = findLikeButton(comment);
    if (!likeButton) {
      STATE.optimisticLikes.delete(comment.id);
      render();
      return;
    }

    try {
      likeButton.click();
    } catch (error) {
      STATE.optimisticLikes.delete(comment.id);
      render();
      return;
    }

    setTimeout(() => {
      STATE.optimisticLikes.delete(comment.id);
      scanComments();
      render();
    }, 550);
  }

  function getCommentLikeState(comment) {
    const optimistic = STATE.optimisticLikes.get(comment.id);
    if (optimistic) return optimistic;

    const parsed = parseLikeLabel(comment.likes);
    return {
      liked: isOriginalLikeActive(comment),
      likesLabel: parsed ? formatLikeLabel(parsed.value, parsed) : "0",
      pending: false
    };
  }

  function adjustLikeLabel(label, delta) {
    const parsed = parseLikeLabel(label);
    if (!parsed) return label;

    const nextValue = Math.max(0, parsed.value + delta);
    return formatLikeLabel(nextValue, parsed);
  }

  function parseLikeLabel(label) {
    const text = normalizeText(String(label || ""))
      .replace(/\blikes?\b/gi, "")
      .replace(/좋아요|맘에 들어요/g, "")
      .trim();
    if (!text || text === "0") return { value: 0, style: "plain" };

    const compactMatch = text.match(/^([\d,.]+)\s*(천|만|억|k|m|b)$/i);
    if (compactMatch) {
      const number = Number(compactMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(number)) return null;
      const unit = compactMatch[2].toLowerCase();
      const multiplier = unit === "천" || unit === "k"
        ? 1000
        : unit === "만"
          ? 10000
          : unit === "억"
            ? 100000000
            : unit === "m"
              ? 1000000
              : 1000000000;
      return { value: Math.round(number * multiplier), style: "compact", unit };
    }

    const value = Number(text.replace(/,/g, ""));
    if (!Number.isFinite(value)) return null;
    return { value, style: text.includes(",") ? "comma" : "plain" };
  }

  function formatLikeLabel(value, parsed) {
    return parsed.style === "plain" && value < 1000
      ? String(value)
      : formatEnglishCompactCount(value);
  }

  function formatEnglishCompactCount(value) {
    const units = [
      { suffix: "B", value: 1000000000 },
      { suffix: "M", value: 1000000 },
      { suffix: "K", value: 1000 }
    ];
    const unit = units.find((item) => value >= item.value);
    if (!unit) return value.toLocaleString("en-US");

    const compactValue = value / unit.value;
    const rounded = compactValue >= 10
      ? Math.round(compactValue).toString()
      : compactValue.toFixed(1).replace(/\.0$/, "");
    return `${rounded}${unit.suffix}`;
  }

  function findLikeButton(comment) {
    const roots = [comment.node, comment.thread].filter(Boolean);
    const selectors = [
      "#like-button button",
      "#like-button",
      "ytd-toggle-button-renderer:first-of-type button",
      "ytd-toggle-button-renderer:first-of-type",
      "like-button-view-model button",
      "like-button-view-model",
      "button",
      "[role='button']"
    ];

    for (const root of roots) {
      for (const selector of selectors) {
        const candidates = queryAll(root, selector)
          .map((candidate) => getClickableElement(candidate));
        const match = candidates.find(isCommentLikeControl);
        if (match) return match;
      }

      const actionButtons = queryOne(root, "ytd-comment-action-buttons-renderer, #toolbar, #footer");
      const firstToggle = queryOne(actionButtons, "#like-button, ytd-toggle-button-renderer:first-of-type, like-button-view-model");
      if (firstToggle) return getClickableElement(firstToggle);
    }

    return null;
  }

  function getClickableElement(element) {
    return queryOne(element, "button") || element;
  }

  function isCommentLikeControl(element) {
    if (!element) return false;

    const haystack = normalizeText([
      element.id,
      element.className,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("aria-pressed"),
      element.innerText,
      element.closest?.("#like-button") ? "like-button" : "",
      element.closest?.("like-button-view-model") ? "like-button-view-model" : ""
    ].filter(Boolean).join(" ")).toLowerCase();

    const looksLikeLike = /(^|\s|-)like($|\s|-)|unlike|remove like|like-button|좋아요|맘에 들어요/.test(haystack);
    const looksLikeDislike = /dislike|싫어요/.test(haystack);
    return looksLikeLike && !looksLikeDislike;
  }

  function isOriginalLikeActive(comment) {
    const button = findLikeButton(comment);
    if (!button) return false;

    const stateElements = uniqueElements([
      button,
      button.closest?.("#like-button"),
      button.closest?.("ytd-toggle-button-renderer"),
      button.closest?.("like-button-view-model"),
      button.closest?.("toggle-button-view-model"),
      button.parentElement
    ]);

    return stateElements.some(isPressedLikeElement);
  }

  function isPressedLikeElement(element) {
    if (!element) return false;

    const stateText = normalizeText([
      element.getAttribute("aria-pressed"),
      element.getAttribute("aria-checked"),
      element.getAttribute("aria-selected"),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.className
    ].filter(Boolean).join(" ")).toLowerCase();

    return /\btrue\b|style-default-active|(^|[\s_-])(active|selected|pressed|liked)([\s_-]|$)|unlike|remove like|좋아요 취소|좋아요 표시됨|선택됨/.test(stateText) &&
      !/dislike|싫어요/.test(stateText);
  }

  function revealCurrentComment(openReplies) {
    const comment = currentComment();
    if (!comment) return;

    comment.thread.scrollIntoView({ block: "center", behavior: "smooth" });
    comment.thread.style.outline = "2px solid #ff3030";
    comment.thread.style.outlineOffset = "8px";
    setTimeout(() => {
      comment.thread.style.outline = "";
      comment.thread.style.outlineOffset = "";
    }, 1800);

    if (openReplies) {
      clickRepliesToggle(comment.thread);
    }
    setReturnToVideoVisible(true);
  }

  function returnToVideo() {
    const target = findPlayerContainer() || document.querySelector("#player, #primary, ytd-watch-flexy") || document.body;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    setReturnToVideoVisible(false);
  }

  function setReturnToVideoVisible(visible) {
    STATE.returnToVideoVisible = visible;
    if (STATE.root) STATE.root.dataset.returnVisible = String(visible);
  }

  function clickRepliesToggle(thread) {
    const toggle = queryAll(thread, "button, yt-button-shape button")
      .find((button) => {
        const text = normalizeText(`${button.innerText || ""} ${button.getAttribute("aria-label") || ""}`);
        return parseReplyCount(text) !== null;
      });

    const label = normalizeText(`${toggle?.innerText || ""} ${toggle?.getAttribute("aria-label") || ""}`).toLowerCase();
    if (!toggle || /hide|숨기/.test(label)) {
      return false;
    }

    toggle.click();
    return true;
  }

  function installVideoTimeWatcher() {
    setInterval(() => {
      const video = document.querySelector("video.html5-main-video, video");
      if (!video || !STATE.comments.length) return;
      maybeShowTimedComment(video.currentTime);
    }, 500);
  }

  function maybeShowTimedComment(currentTime) {
    if (STATE.selectingContent || Date.now() < STATE.selectionLockUntil) return;
    if (Date.now() - STATE.lastUserNavigationAt < 4000) return;

    const match = STATE.comments.find((comment) =>
      comment.timestamps.some((timestamp) =>
        currentTime >= timestamp.seconds && currentTime < timestamp.seconds + 3.5
      )
    );

    if (!match || match.id === STATE.lastAutoCommentId) return;

    const nextIndex = STATE.comments.findIndex((comment) => comment.id === match.id);
    if (nextIndex < 0) return;

    STATE.index = nextIndex;
    STATE.lastAutoCommentId = match.id;
    render();
    scheduleAutoAdvance(true);
  }

  function getVideoId() {
    if (location.pathname === "/watch") {
      return new URLSearchParams(location.search).get("v") || "";
    }

    const shortsMatch = location.pathname.match(/^\/shorts\/([^/?#]+)/);
    return shortsMatch?.[1] || "";
  }

  function isPlayableVideoPage() {
    return Boolean(getVideoId()) ||
      location.pathname === "/live";
  }

  init();
})();
