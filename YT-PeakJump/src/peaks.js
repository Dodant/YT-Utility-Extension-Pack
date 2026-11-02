// Peaks of the "Most replayed" data, highest first, as milliseconds into the video.
// Reads the heat markers embedded in the watch page HTML (two formats YouTube has used).
// ponytail: regex over page JSON, breaks if YouTube renames these keys; update the patterns then.
const MARKER_PATTERNS = [
  /"startMillis":"(\d+)","durationMillis":"(\d+)","intensityScoreNormalized":([\d.eE+-]+)/g,
  /"timeRangeStartMillis":"?(\d+)"?,"markerDurationMillis":"?(\d+)"?,"heatMarkerIntensityScoreNormalized":([\d.eE+-]+)/g,
];

function findPeaks(html) {
  let pts = [];
  for (const re of MARKER_PATTERNS) {
    pts = [...html.matchAll(re)].map((m) => ({ ms: +m[1] + m[2] / 2, v: +m[3] }));
    if (pts.length) break;
  }
  return pts
    .filter((p, i) => p.v > 0 && (i === 0 || p.v > pts[i - 1].v) && (i === pts.length - 1 || p.v >= pts[i + 1].v))
    .sort((a, b) => b.v - a.v)
    .map((p) => p.ms);
}
