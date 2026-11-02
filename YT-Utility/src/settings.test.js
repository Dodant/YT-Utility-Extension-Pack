// Run: node src/settings.test.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const src = fs.readFileSync(__dirname + "/settings.js", "utf8");

// Load settings.js against stub DOM + chrome.storage; returns the pieces a test needs.
function load({ stored = {}, setThrows = false, setRejects = false } = {}) {
  const attrs = new Set(), vars = {};
  let getCb, changed;
  const ctx = {
    document: { documentElement: {
      toggleAttribute: (a, on) => (on ? attrs.add(a) : attrs.delete(a)),
      style: { setProperty: (k, v) => (vars[k] = v) },
    } },
    chrome: { storage: {
      sync: {
        get: (defaults, cb) => (getCb = () => cb({ ...defaults, ...stored })),
        set: () => { if (setThrows) throw new Error("Extension context invalidated."); return setRejects ? Promise.reject(new Error("quota")) : Promise.resolve(); },
      },
      onChanged: { addListener: (fn) => (changed = fn) },
    } },
  };
  vm.runInNewContext(src, ctx);
  const calls = [];
  ctx.YTU.onChange((k, v) => calls.push([k, v]));
  return { YTU: ctx.YTU, attrs, vars, calls, storageLoaded: () => getCb(), changed: (c) => changed(c, "sync") };
}

(async () => {
  // Defaults are on <html> before storage answers; attribute names are what feed.css / grid-fill.js expect.
  let t = load();
  for (const a of ["data-ytu-comment", "data-ytu-thumbnail", "data-ytu-nexthover", "data-ytu-peakjump", "data-ytu-hideplaylists", "data-ytu-hideshorts"]) assert(t.attrs.has(a), a);
  assert(!t.attrs.has("data-ytu-cols"));

  // Stored values apply on load and notify only for keys that changed.
  t = load({ stored: { cols: 4, hideShorts: false } });
  t.storageLoaded();
  assert(t.attrs.has("data-ytu-cols") && t.vars["--ytu-cols"] === 4);
  assert(!t.attrs.has("data-ytu-hideshorts"));
  assert.deepStrictEqual(t.calls, [["hideShorts", false], ["cols", 4]]);

  // Changes from another tab: same value and unknown keys are ignored; a removed key falls back to its default.
  t = load();
  t.changed({ comment: { newValue: true }, bogus: { newValue: 1 } });
  assert.deepStrictEqual(t.calls, []);
  t.changed({ comment: { newValue: false } });
  t.changed({ comment: { newValue: undefined } });
  assert.deepStrictEqual(t.calls, [["comment", false], ["comment", true]]);

  // A failed save re-notifies the current value so the menu control flips back: sync throw (stale tab) and async reject (quota).
  t = load({ setThrows: true });
  t.YTU.set("comment", false);
  assert.deepStrictEqual(t.calls, [["comment", true]]);
  t = load({ setRejects: true });
  t.YTU.set("cols", 5);
  await new Promise((r) => setTimeout(r));
  assert.deepStrictEqual(t.calls, [["cols", 0]]);

  console.log("ok");
})();
