## 2025-05-18 - Fast-path URL parsing scheme checks in client unblocker

**Learning:** Constructing `new URL()` objects for non-HTTP/HTTPS protocols (e.g. `javascript:`, `data:`, `about:`, `blob:`, `mailto:`, `tel:`) on client-side requests/elements introduces unnecessary GC and parsing overhead. Checking schemes early before `new URL()` yields a ~16.5% speedup in `fixUrl` execution time.

**Action:** Always place lightweight string/scheme fast-path checks before expensive object instantiations like `new URL()` in high-frequency client utility functions.

## 2025-05-19 - Pre-computing template strings and single-pass regex in streaming transforms

**Learning:** Re-assembling template arrays (`[...].join('\n')`) and running two-pass regex checks (`/pattern/.test()` then `.replace()`) inside high-frequency stream transforms creates unnecessary GC allocation and redundant regex evaluation per chunk. Pre-computing replacement strings with `$&` enables a single-pass `replace` execution that is 33% to 56% faster.

**Action:** Pre-compute static transform strings outside hot stream handlers and use single-pass string replacement with `$1`/`$&` match specifiers instead of testing then replacing.

## 2025-05-20 - Lazy base URL evaluation and fast-path string checks in URL proxy rewriter

**Learning:** Passing a base URL string (`new URL(input, base)`) forces unnecessary string concatenation and base resolution logic even when `input` is already an absolute HTTP/HTTPS URL. Additionally, running regex `.replace()` for rare malformed single-slash schemes on every URL string causes execution overhead. Guarding regex operations with `indexOf(':/') !== -1 && indexOf('://') === -1` and lazily constructing `base` only when input is relative yields a ~17.1% performance speedup in `fixUrl`.

**Action:** Only construct or compute base URL parameters when resolving relative inputs, and use fast `indexOf` character guards before executing regex replacements on hot URL transformation paths.
