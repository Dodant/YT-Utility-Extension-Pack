// Run: node src/peaks.test.js
const fs = require("fs");
const assert = require("assert");
eval(fs.readFileSync(__dirname + "/peaks.js", "utf8"));

// Intensities 0.2, 0.8, 0.3, 0.6, 0.1 over 1s markers -> peaks at 1.5s then 3.5s.
const mk = (v, i) => `{"startMillis":"${i * 1000}","durationMillis":"1000","intensityScoreNormalized":${v}}`;
assert.deepStrictEqual(findPeaks([0.2, 0.8, 0.3, 0.6, 0.1].map(mk).join(",")), [1500, 3500]);

const old = (v, i) => `"timeRangeStartMillis":${i * 1000},"markerDurationMillis":1000,"heatMarkerIntensityScoreNormalized":${v}`;
assert.deepStrictEqual(findPeaks([0.1, 1, 0.5].map(old).join(",")), [1500]);

assert.deepStrictEqual(findPeaks(""), []);
console.log("ok");
