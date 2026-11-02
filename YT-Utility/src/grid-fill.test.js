// Run: node src/grid-fill.test.js
const fs = require("fs");
const assert = require("assert");
eval(fs.readFileSync(__dirname + "/grid-fill.js", "utf8"));

// 3 per row: shelf after 2 videos waits for the 3rd video; hidden cards take no slot.
assert.deepStrictEqual(arrange(["item", "item", "block", "item", "hidden", "item"], 3), [0, 1, 3, 2, 4, 5]);
// Full row before a shelf: nothing moves.
assert.deepStrictEqual(arrange(["item", "item", "block", "item"], 2), [0, 1, 2, 3]);
// Not enough videos left: shelf goes last.
assert.deepStrictEqual(arrange(["item", "block", "hidden"], 3), [0, 2, 1]);
// Feed layout is only touched while a feed option is on.
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: false, cols: false }), false);
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: true, cols: false }), true);
assert.strictEqual(feedActive({ hideplaylists: false, hideshorts: false, cols: true }), true);
console.log("ok");
