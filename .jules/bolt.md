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

## 2025-05-23 - Fast-path equality guard on history recording to avoid redundant localStorage writes

**Learning:** In client-side tracking functions like `saveToHeavenlyHistory` triggered on DOM mutations or page load events, parsing `localStorage` history arrays and executing `.filter()`, `.unshift()`, `.slice()`, and `JSON.stringify()` on every invocation introduces unnecessary CPU and synchronous storage I/O overhead. Checking whether the most recent entry `current[0]` already matches the target URL and title enables an early return that speeds up execution by ~31% to ~36%.

**Action:** Add fast-path equality guards against the top entry of persistent state arrays before performing array transformations and synchronous `localStorage` updates.

## 2025-05-24 - Replacing substr() string slicing with startsWith() in hot client URL rewriters

**Learning:** Slicing strings with `substr(0, N)` inside high-frequency client-side functions like `fixUrl`, `getCurrentRemoteHref`, and `getDirectRemoteUrl` creates unnecessary string slice allocations on the heap on every URL evaluation. Using native `String.prototype.startsWith()` avoids heap allocation per check and runs ~59.9% faster in hot loop execution.

**Action:** Prefer `String.prototype.startsWith()` over `substr(0, N) === ...` when performing prefix checks on hot execution paths to reduce garbage collection pressure.

## 2025-05-25 - Fast-guarding structural DOM elements in MutationObserver node traversal

**Learning:** During DOM mutation observation, traversing added element subtrees (e.g. `DIV`, `SPAN`, `P`, `LI`, `TR`, `TD`, etc.) and calling `el.tagName.toLowerCase()` and `getAttribute()` on every element node creates significant string allocation and CPU overhead. Additionally, replacing `.toLowerCase()` with multi-operand string equality checks (e.g. `tag === 'IMG' || tag === 'SCRIPT' ...`) in V8 is actually slower than `.toLowerCase()`. Guarding traversal with an early check for common non-resource structural tags (`DIV`, `SPAN`, `P`, etc.) bypasses `toLowerCase()` and attribute extraction entirely, yielding a ~36.5% speedup in DOM mutation processing time.

**Action:** When scanning or processing DOM element subtrees for URL rewriters or attribute observers, add a fast-path guard for common structural tags (`DIV`, `SPAN`, `P`, etc.) to skip string lowercasing and attribute checks for non-resource elements.

## 2025-05-26 - Passing pre-loaded settings object across client initializers to eliminate redundant localStorage reads

**Learning:** Re-reading `localStorage` and executing `JSON.parse` across multiple independent client initializers (`initHeavenlyCloakAndPanic`, `initHeavenlyWidgets`, `initManualIconPickerWidget`, `initFolderQuickSaveWidget`, `initNewgroundsPagination`, `saveToHeavenlyHistory`) during page/iframe startup blocks the main thread with redundant synchronous storage I/O and JSON parsing overhead. Loading the `settings` object once at `initForWindow` and passing it down to all sub-initializers yields a ~51% speedup in initialization performance.

**Action:** Load persistent configuration/settings objects once at the top-level initialization function and pass the object directly into sub-initializers rather than invoking `localStorage.getItem` + `JSON.parse` inside each function.

## 2025-05-27 - Fast-path O(1) prefix check before URL scheme normalization regexes

**Learning:** Running regex replacements for rare malformed single-slash URLs (e.g. `/^(https?:\/)([^\/])/i`) on every request, redirect, or referer header causes unnecessary regex engine invocation. Unanchored character searches like `indexOf('://')` scan full $O(N)$ query strings and can incorrectly match `://` in query params. Using $O(1)$ prefix guards (`!ref.startsWith('http://') && !ref.startsWith('https://')` / `!urlStr.startsWith('/proxy/http://') && !urlStr.startsWith('/proxy/https://')`) safely bypasses regex execution on standard double-slash URLs while preserving full normalization support, speeding up request/header normalization by ~22.6%.

**Action:** Guard anchored scheme normalization regexes with $O(1)$ `startsWith()` checks against standard valid protocols (`http://` and `https://`) rather than unanchored substring searches.
