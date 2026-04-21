export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function printStats(label, results, total) {
  if (results.length === 0) {
    console.log('\nNo successful measurements.');
    return;
  }
  const sorted = [...results].sort((a, b) => a - b);
  const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);

  console.log(`\n${label}:`);
  console.log(`Successful runs : ${results.length}/${total}`);
  console.log(`Min             : ${sorted[0]}ms`);
  console.log(`Max             : ${sorted[sorted.length - 1]}ms`);
  console.log(`Average         : ${avg}ms`);
  console.log(`p50             : ${percentile(sorted, 50)}ms`);
  console.log(`p95             : ${percentile(sorted, 95)}ms`);
  console.log(`p99             : ${percentile(sorted, 99)}ms`);
}
