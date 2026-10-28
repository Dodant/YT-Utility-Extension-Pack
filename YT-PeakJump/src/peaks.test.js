// Run: node src/peaks.test.js
const fs = require("fs");
const assert = require("assert");
eval(fs.readFileSync(__dirname + "/peaks.js", "utf8"));

// Samples at x=100..500 with intensities 20, 80, 30, 60, 10 (y = 100 - intensity).
const d = "M 0,100 C 0,0 0,0 100,80 C 0,0 0,0 200,20 C 0,0 0,0 300,70 C 0,0 0,0 400,40 C 0,0 0,0 500,90";
assert.deepStrictEqual(findPeaks(d), [0.2, 0.4]);
assert.deepStrictEqual(findPeaks(""), []);
console.log("ok");
