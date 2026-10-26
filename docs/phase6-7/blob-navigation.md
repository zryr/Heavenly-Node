# Blob navigation experiment

**Decision: keep about:blank as the existing launch option.** No Blob mode was added to Settings, Academy, navigation helpers, or normal homepage messages. The only navigation prototype is [isolated QA code](../../test/browser/blob_navigation_qa.cjs).

The experiment creates a real `Blob` with `text/html`, obtains its object URL through `URL.createObjectURL`, and opens it from an explicit click with a null opener. It does not try to navigate to a fabricated `blob:null` string. A separate local HTTP fixture avoids changing application routes or saved settings.

Executed Chromium 154.0.8037.57, Firefox 153.0, and Linux WebKit 26.5: all three completed the three experimental groups. [Actual observations](evidence/blob-navigation.json) and [execution log](evidence/blob-navigation.txt) are included. Passing means the observations were captured, not that Blob navigation is approved for shipping.

| Observation | Chromium | Firefox | Linux WebKit |
| --- | --- | --- | --- |
| Explicit title and null opener | Works | Works | Works |
| Creator-origin browser storage readable | Yes | Yes | Yes |
| Absolute link, Back, reload before revocation | Works | Works | Works |
| Relative link resolved against object URL | Cannot resolve | Cannot resolve | Cannot resolve |
| Fetch after URL revocation | Rejected | Rejected | Previously loaded URL remained retrievable |
| Reload after URL revocation | Navigation rejected | Document retained | Document retained |

These results expose lifecycle and history differences. An object URL does not create a security boundary, hide requests from a network, or automatically make embedded content safe. Its URL contains the creator origin in this experiment. Existing HTML Viewer sandbox restrictions must remain independent of the outer launch address.

The prototype does not demonstrate physical Apple Safari, mobile browser lifecycle, long sessions, creator-tab closure, external-site embedding compatibility, or popup-blocker reliability. It therefore does not meet the requested compatibility, security, and reliability threshold for an ordinary user option. The production information launcher retains about:blank and an explicit normal-tab recovery path.

Repeat with:

```sh
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules \
node test/browser/blob_navigation_qa.cjs
```
