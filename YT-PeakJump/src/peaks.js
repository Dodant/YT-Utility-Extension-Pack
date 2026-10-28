// Peaks of the "Most replayed" heat map, highest first, as fractions (0–1) of the video.
// The path is `M x,y` followed by cubic `C` segments; each segment's end point is a sample.
// y grows downward, so a smaller y means more replays.
function findPeaks(d, width = 1000, height = 100) {
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += i === 0 ? 2 : 6) {
    const at = i === 0 ? i : i + 4; // M point, then the 3rd pair of each C
    if (at + 1 < nums.length) pts.push({ x: nums[at], v: height - nums[at + 1] });
  }
  return pts
    .filter((p, i) => p.v > 0 && (i === 0 || p.v > pts[i - 1].v) && (i === pts.length - 1 || p.v >= pts[i + 1].v))
    .sort((a, b) => b.v - a.v)
    .map((p) => p.x / width);
}
