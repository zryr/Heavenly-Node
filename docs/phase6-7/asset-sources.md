# Academy image sources

Checked on 2026-10-25. The Academy is a fictional educational demonstration. The photograph is an illustration of a real library, not evidence of a Morrowfield Academy building, affiliation, or endorsement.

## Shipped photograph

**George Peabody Library, Baltimore**, photographed by **Matthew Petroff** on 15 January 2013.

- [Wikimedia Commons source and author credit](https://commons.wikimedia.org/wiki/File:George-peabody-library.jpg), Commons page ID `24162642`.
- [Original JPEG](https://upload.wikimedia.org/wikipedia/commons/c/c1/George-peabody-library.jpg).
- [Creative Commons Attribution-Share Alike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/).
- Commons identifies the photograph as the contributor's own work, attributes it to Matthew Petroff, and reports `AttributionRequired: true` and `License: cc-by-sa-3.0`. Both the source page and the official license page were successfully fetched. The relevant API metadata and derivative hashes are recorded in [evidence/asset-license.json](evidence/asset-license.json).

Downloaded the Commons 1920 × 1440 JPEG thumbnail and resized it locally with Pillow/Lanczos, then encoded WebP at quality 78. No content was generated, added, or removed. The application can display the image with a CSS crop. These image derivatives retain CC BY-SA 3.0; the rest of the project retains its own licenses.

| Local asset | Dimensions | Bytes |
| --- | --- | --- |
| `public/assets/academy/library-640.webp` | 640 × 480 | 85,024 |
| `public/assets/academy/library-960.webp` | 960 × 720 | 186,458 |
| `public/assets/academy/library-1600.webp` | 1600 × 1200 | 484,246 |

Public attribution and the derivative license are also available at [`/assets/academy/LICENSE.txt`](../../public/assets/academy/LICENSE.txt). The Academy's visible photo credit must identify the actual library and Matthew Petroff, link the source and CC BY-SA 3.0 license, and disclose resizing/display cropping. Its description must not imply that the fictional academy owns the location.

## Selection and delivery

The library's warm stone, book stacks, tall windows, and structured perspective support the navy/cream editorial direction without using a real school's identity. Source photography was inspected before selection. Responsive local files avoid a runtime dependency on the source host; width and height reserve space before loading.

Additional CC0 library photographs from Commons were researched but were not added to the repository: they were visually weaker for the chosen direction. One relevant, credited photograph is preferable to unrelated filler. Unsplash's photo and license pages returned HTTP 401 in this environment, so no unverified Unsplash asset was shipped.
