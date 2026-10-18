# Bookmark experience and proxy compatibility

## Data and implementation map

The current app has three `DEFAULT_BOOKMARK_DATA` readers: `public/index.html` (homepage), `public/settings.html` (management/import/export), and `promptBookmarkCurrentPage()` in `custom-client/unblocker-client.js` (Save to Bookmarks widget). Keep their built-in IDs, destinations and icon paths synchronized. Shared URL comparison, missing-bookmark ordering and icon migration live in `public/assets/heavenly-navigation.js`, already loaded by all three readers.

Coolmath (`bm_coolmath`) is last among the built-in Games defaults. Existing collections receive it after their current Games order, without reordering existing entries. An existing Coolmath homepage URL, including a nested bookmark, prevents a second default entry. Paths, queries and fragments distinguish individual game bookmarks. The two actual hostnames, with or without `www`, compare equally; lookalike hosts do not.

The existing localStorage schema and `heavenly_bookmarks` key remain unchanged. Reconciliation preserves custom icons and user-saved children inside built-in folders. Earlier reconciliation deleted those children when absent from the defaults; removing that pruning prevents further loss (it cannot restore previously deleted data). The icon migration changes only exact known shipped paths and the two built-in FMHY entries' old Halloween image paths. Hidden categories, bookmark IDs, custom ordering, launch preferences and unrelated settings remain stored as before.

## Coolmath popup and launch boundary

`openBuiltinTestModal()` delegates real Coolmath URLs to the compact `coolmath-launch-modal`. It reuses the homepage bookmark modal surfaces, offers the purple compatibility note, and uses the existing `openAddModal()` editor for Save to Bookmarks. Existing top-level bookmarks open for editing; existing nested bookmarks report that the page is saved. New game URLs retain category, title and icon controls. The widget also checks the latest stored collection before saving, preventing duplicate entries and overwriting another tab's newly saved bookmarks.

`HeavenlyNavigation.launch()` automatically selects its existing `openBlank()` launcher for intentional Coolmath **proxy** launches. Neither resource rewriting nor in-site navigation calls this boundary. Explicit proxy actions in the existing FMHY/EverythingMoe outbound-link dialogs use the same Coolmath launch boundary. Direct URLs stay direct. Explicit `aboutBlank: false` remains available for normal proxy recovery, and the wrapper's existing **Open normally** control uses the current proxied destination. Popup-blocked recovery offers one current-tab fallback, with no automatic retries or global preference changes.

The popup respects saved prompt suppression and per-bookmark launch preferences; an explicit Direct preference takes precedence over global prompt suppression. Keyboard focus is contained in the popup, Escape/backdrop/close return focus to the launcher, and controls have at least 44px touch targets. The notice has no animation; the compact cards omit the existing spring/glow effect.

This requested automatic launch choice supersedes the earlier optional-only recommendation in `coolmath-final-launch-comparison.md`. The compatibility findings in that report remain valid: about:blank does not change the proxied game's hostname, and no game validator, compiled code or third-party security rule is modified. Some games still require the original website.

## Special Links

`isSpecialBookmark()` identifies the existing stable IDs `bm_fmhy_movies`, `bm_fmhy_anime`, and `bm_everythingmoe`. Each entry is available from its current category heading's Special Links icon, including after moving a bookmark to a different category. The normal list omits those built-in cards; searching includes them so their existing management actions remain available. The popup reads the same stored objects and respects hidden entries and launch preferences. It closes before opening the existing FMHY/EverythingMoe launch dialog. Syshi's Notes remain separate.

## Assets

Small bookmark images use `public/assets/icons/*-icon.*`. The uploaded FMHY image is moved unchanged to `fmhy-halloween-icon.png`; Coolmath's locally served `coolmath-icon.ico` is the verified official `/favicon.ico`. Arctic's existing `artic` spelling is retained for path continuity. Genuine Heavenly brand imagery keeps the `heavenly-logo.png` name.

Old `/assets/{artic,aether,doc-of-docs,nexus,opium}-logo.png` URLs receive same-origin 308 redirects to their moved files, preserving saved/exported icon references without duplicate image copies. Express serves these files through the existing assets mount and Vercel's included `public/**`. Homepage image errors retain the existing local Heavenly image fallback.

## FMHY investigation and fix

Checks on October 17, 2026 (America/Chicago) confirmed `/video` and `/video#anime-streaming` remain valid. Direct FMHY and the production proxy initially return the correct Movies/TV/Anime document. After hydration, production's VitePress router resolves the visible `/proxy/https://fmhy.net/video` as a site page, misses its page hash map, and displays FMHY's own **PAGE NOT FOUND** view. This is a client router failure, not an invalid bookmark URL or upstream document 404. The separately repaired `vercel.live/_next-live/` handling remains unchanged.

`lib/vitepress-router.js` adapts only recognized VitePress app/framework module shapes: two route URL reads receive the remote site path, and the page-module dynamic import receives its proxied address. Native `URL`, `Location`, origins, browser history and upstream errors stay intact. The adapter accepts only the known module filename families, requires its framework signatures and exact match counts, and caps buffering at 2 MiB. Unknown/new framework shapes pass through unchanged rather than applying broad JavaScript substitutions. Future VitePress minification changes may require updating this narrow adapter.

A second verified bug affected FMHY's CSS `data:image/svg+xml` icons: node-unblocker rewrote the single-quoted `xmlns='http://www.w3.org/2000/svg'` identifier into a proxy URL. The streaming prefixer now restores XML namespace identifiers in HTML/CSS/SVG, while retaining ordinary asset URL rewriting. Existing srcset, lazy image, script, redirect and navigation handling remains in place. No speculative CDN/font rewrite was added.

Live local Chromium checks now retain the hydrated Movies/Anime heading and navigate internally to Gaming/Emulation. The FMHY logo loads and SVG namespaces are valid. Unrelated Cloudflare analytics requests can still return 404; upstream speculative prefetches intermittently return 503, also observed directly. Those statuses are not hidden or treated as homepage success.

## Touch audit and verification

Current main already includes deliberate 500ms handle-only bookmark/category/section dragging, 8px pre-hold movement cancellation, passive card scrolling, cleanup on cancellation/multiple touches/blur/hidden documents, ghost cleanup and click suppression. Retain those fixes. Quick Settings retains its pointer-handle hold and keyboard movement controls; a second finger now explicitly cancels pending and active drags instead of allowing the first pointer to finish a reorder. Narrow category headings wrap so the new launcher fits at 320px. No separate tab-order system exists in this UI.

Run `npm test`, `node test/browser/bookmark_experience.cjs`, `node test/browser/bookmark_management.cjs`, `node test/browser/proxy_widgets_diagnostics.cjs`, `node test/browser/navigation_history.cjs`, `node test/browser/game_launch_modes.cjs`, and `node test/browser/quick_settings_customization.cjs` with the existing optional Playwright tooling. Browser binaries and any local test libraries are development tooling only; no production dependency was added.

Browser automation and emulated touch do not establish physical iPad Safari or Chromebook behavior. The new browser test supports `HEAVENLY_BROWSER=firefox|webkit` when those engines and their host libraries are available.

Verified before PR submission: `npm test` **384 passing**; Chromium **75 browser checks** across bookmark UI, touch management, widgets, history, launch modes and Quick Settings; WebKit **16 checks** across bookmark UI and widgets. Syntax and `git diff --check` passed. Firefox could not start in this managed environment (read-only user-namespace mapping/compositor startup failure); it is not reported as tested. WebKit's required host libraries were supplied only in the scratch browser tooling, without repository dependencies or changes to application security.
