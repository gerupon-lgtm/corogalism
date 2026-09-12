/**
 * シード付き乱数（xorshift32）。
 * 同じシードなら常に同じ列を返す。迷路生成の再現性（F-123）の土台。
 */
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296; // [0, 1)
  };
}

/** [0, n) の整数 */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}
