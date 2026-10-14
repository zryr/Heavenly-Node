const { performance } = require("perf_hooks");

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

function unoptimizedEscapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optimizedEscapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  if (!/[&<>"']/.test(s)) return s;
  return s.replace(/[&<>"']/g, function(m) { return HTML_ESCAPE_MAP[m]; });
}

const testStrings = [
  "Google Classroom",
  "https://example.com/search?q=test&page=1",
  "Simple Normal String Without Special Chars",
  "Hello <World> & \"Friends\" 'test'",
  "https://wikipedia.org/wiki/Main_Page",
  "Another Clean String For Testing"
];

const ITERATIONS = 1000000;

// Warmup
for (let i = 0; i < 10000; i++) {
  testStrings.forEach(s => {
    unoptimizedEscapeHtml(s);
    optimizedEscapeHtml(s);
  });
}

const startUnopt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const s = testStrings[i % testStrings.length];
  unoptimizedEscapeHtml(s);
}
const timeUnopt = performance.now() - startUnopt;

const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const s = testStrings[i % testStrings.length];
  optimizedEscapeHtml(s);
}
const timeOpt = performance.now() - startOpt;

console.log(`Unoptimized: ${timeUnopt.toFixed(2)} ms`);
console.log(`Optimized:   ${timeOpt.toFixed(2)} ms`);
console.log(`Speedup:     ${(((timeUnopt - timeOpt) / timeUnopt) * 100).toFixed(2)}% faster`);
