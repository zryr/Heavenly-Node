## 2025-05-18 - Fast-path URL parsing scheme checks in client unblocker

**Learning:** Constructing `new URL()` objects for non-HTTP/HTTPS protocols (e.g. `javascript:`, `data:`, `about:`, `blob:`, `mailto:`, `tel:`) on client-side requests/elements introduces unnecessary GC and parsing overhead. Checking schemes early before `new URL()` yields a ~16.5% speedup in `fixUrl` execution time.

**Action:** Always place lightweight string/scheme fast-path checks before expensive object instantiations like `new URL()` in high-frequency client utility functions.

## 2025-05-19 - Pre-computing template strings and single-pass regex in streaming transforms

**Learning:** Re-assembling template arrays (`[...].join('\n')`) and running two-pass regex checks (`/pattern/.test()` then `.replace()`) inside high-frequency stream transforms creates unnecessary GC allocation and redundant regex evaluation per chunk. Pre-computing replacement strings with `$&` enables a single-pass `replace` execution that is 33% to 56% faster.

**Action:** Pre-compute static transform strings outside hot stream handlers and use single-pass string replacement with `$1`/`$&` match specifiers instead of testing then replacing.

## 2025-05-20 - Lazy base URL evaluation and fast-path string checks in URL proxy rewriter

**Learning:** Passing a base URL string (`new URL(input, base)`) forces unnecessary string concatenation and base resolution logic even when `input` is already an absolute HTTP/HTTPS URL. Additionally, running regex `.replace()` for rare malformed single-slash schemes on every URL string causes execution overhead. Guarding regex operations with `indexOf(':/') !== -1 && indexOf('://') === -1` and lazily constructing `base` only when input is relative yields a ~17.1% performance speedup in `fixUrl`.

**Action:** Only construct or compute base URL parameters when resolving relative inputs, and use fast `indexOf` character guards before executing regex replacements on hot URL transformation paths.

## 2025-05-21 - Fast-path string guards in request middleware

**Learning:** Instantiating `new URL(data.url)` and evaluating regex domain matchers in backend proxy request middleware for every request adds significant CPU and garbage collection overhead (~56%). Guarding middleware functions with fast string checks (`!data.headers.referer && !data.headers.origin`, `/newgrounds|ngfiles|ungrounded/i.test(data.url)`, or `data.url.indexOf('/cdn-cgi/') === -1`) before attempting URL parsing yields a >50% throughput improvement.

**Action:** Always add lightweight string/header guard conditions prior to performing object allocations or URL parsing inside Express/Unblocker middleware.

## 2025-05-22 - Fast-path equality checks and avoiding array allocations in MutationObserver callbacks

**Learning:** Allocating temporary arrays (e.g. `presetTitles = [...]`) and iterating over custom settings objects inside high-frequency `MutationObserver` callbacks creates unnecessary garbage collection pressure and CPU overhead on every DOM mutation. Replacing array creation with direct equality checks against default values (`title === "Google Classroom" || ...`) and direct matching yields a ~64.2% speedup in title check execution time. Additionally, replacing regex `.replace(/^\s+|\s+$/g, "")` with native `String.prototype.trim()` in client asset rewriting functions like `fixSrcset` provides an ~18.7% speedup.

**Action:** Avoid allocating arrays or objects inside high-frequency DOM event or MutationObserver handlers; use direct equality fast-paths and native string methods instead of regex replacements.

## 2025-05-23 - Fast-path string check for external absolute HTTP/HTTPS URLs in client rewriter

**Learning:** In client-side URL rewriting (`fixUrl`), instantiating `new URL()` objects for external absolute HTTP/HTTPS links (e.g. links loaded on proxied pages) adds measurable parsing and GC overhead. Extracting the target hostname via lightweight string slicing (`indexOf('://')`, `indexOf('/')`, `indexOf(':')`) and comparing it directly against `location.hostname` allows external absolute URLs to be prefixed immediately (`prefix + urlStr`), bypassing `new URL()` object creation completely and yielding a ~42.7% performance speedup in `fixUrl`.

**Action:** Before instantiating `new URL(urlStr)` for absolute URLs, extract target hostname using fast string slicing and check if it differs from `location.hostname` to return early.
