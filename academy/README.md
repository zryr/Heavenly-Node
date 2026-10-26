# Academy documents

Edit page copy in `pages/*.html`, shared navigation in `header.html` and
`footer.html`, and document titles in `pages.json`. Run:

```sh
node scripts/build-academy.cjs
node scripts/build-academy.cjs --check
```

Commit the generated `public/academy/*.html` with its sources. They contain
literal, readable HTML and run without JavaScript. Express reserves their
extensionless `/academy` routes before proxy Referer recovery. The generator
replaces decorative arrow/menu characters with local inline SVGs, and sets the
current page in shared navigation.

The generated documents in `public/academy-errors` come from `recovery/`.
`lib/academy-routes.js` caches those documents at startup: unknown page names
receive 404, and a genuine read failure for a known page receives 503. Planned
portal features use the normal `status` page with HTTP 200. No navigation link
pretends a planned feature is a live outage.

The fictional Morrowfield identity, local photograph derivatives and attribution
are intentional. Preserve `public/assets/academy/LICENSE.txt` when changing the
George Peabody Library photograph. Runtime behavior lives in the three
`public/assets/academy-*.js` / `academy.js` files and `academy.css`; the trusted
information-page shell is separate from the HTML Viewer's untrusted preview.
