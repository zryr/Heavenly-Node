/* Shared, DOM-only dialog and Quick Save, usable on home and supported proxy pages. */
(function (root) {
  "use strict";
  var model = root.HeavenlyCollections,
    doc = root.document;
  var css = `:host{color-scheme:dark;font:15px/1.5 Outfit,system-ui,sans-serif;color:#eaf2ff}*{box-sizing:border-box}dialog{color:#eaf2ff;background:#101b30;border:1px solid #53688a;border-radius:22px;padding:24px;width:min(640px,calc(100vw - 24px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;box-shadow:0 30px 100px #0008;font:inherit}dialog::backdrop{background:#030918bc;backdrop-filter:blur(4px)}h2,h3,p{margin:0 0 12px}h2{font-size:1.45rem;font-weight:650}h3{font-size:1.05rem}p,small{color:#b9c9df}button,input,select,textarea{font:inherit;color:inherit}button,a.button{border:1px solid #476182;border-radius:11px;padding:9px 13px;background:#1d304d;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:42px;gap:7px;color:#eaf2ff}button:hover,a.button:hover{border-color:#96d8ed;background:#294565}button:disabled{opacity:.5;cursor:default}button.primary{background:linear-gradient(110deg,#24577d,#4a407c);border-color:#83a9d0}button[aria-pressed=true],button[aria-selected=true]{background:#32486f;border-color:#aab8ff;color:#fff}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #b7a4ff;outline-offset:3px}input:not([type=checkbox]):not([type=range]),select,textarea{display:block;width:100%;min-width:0;background:#0c1729;border:1px solid #4a6080;border-radius:10px;padding:10px;margin:5px 0 14px}input[type=checkbox]{width:18px;height:18px;accent-color:#ada8ff;vertical-align:middle}label{display:block;margin-bottom:8px}textarea{resize:vertical;min-height:75px}.top,.row,.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.top{justify-content:space-between;align-items:start;margin-bottom:14px}.top h2{flex:1;min-width:0;overflow-wrap:anywhere}.close{font-size:20px;min-width:44px;padding:4px}.actions{justify-content:flex-end;margin-top:16px}.status{color:#b3e8ef;min-height:24px;margin:8px 0;overflow-wrap:anywhere}.error{color:#ffb5bd}.muted{color:#b4c6df;font-size:.84rem}.empty{padding:28px 20px;border:1px dashed #53688a;border-radius:16px;background:#15223a;text-align:center}.list{display:grid;gap:10px}.destination{display:flex;align-items:center;gap:10px;border:1px solid #405574;border-radius:12px;padding:10px;overflow-wrap:anywhere}.destination:has(input:checked){border-color:#b1a1f0;background:#2b3154}.destination small{display:block}.destination.child{margin-left:20px}.scroll{max-height:32vh;overflow:auto;padding:5px}.full{width:100%}.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}details{border:1px solid #405574;border-radius:12px;padding:12px;margin-top:10px}summary{cursor:pointer;min-height:28px}a{color:#a9e1ff;overflow-wrap:anywhere}[hidden]{display:none!important}@media(max-width:540px){dialog{padding:18px;border-radius:16px}.split{grid-template-columns:1fr}.actions button{flex:1}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
  function el(tag, text, cls) {
    var n = doc.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function button(text, fn, cls) {
    var b = el("button", text, cls);
    b.type = "button";
    b.onclick = fn;
    return b;
  }
  function field(parent, label, type, value) {
    var l = el("label", label),
      i = el(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") i.type = type || "text";
    i.value = value || "";
    l.append(i);
    parent.append(l);
    return i;
  }
  function select(parent, label, choices, value) {
    var l = el("label", label),
      s = el("select");
    s.setAttribute("aria-label", label);
    choices.forEach(function (c) {
      var o = el("option", c.title);
      o.value = c.id;
      s.append(o);
    });
    s.value = value === undefined ? choices[0]?.id || "" : value || "";
    l.append(s);
    parent.append(l);
    return s;
  }
  function dialog(title, extra) {
    var before = doc.activeElement;
    while (before && before.shadowRoot && before.shadowRoot.activeElement)
      before = before.shadowRoot.activeElement;
    var focusKey = before && before.dataset && before.dataset.focusKey,
      originRoot = before && before.getRootNode();
    var host = el("div");
    host.className = "hn-dialog-host";
    var shadow = host.attachShadow({ mode: "open" }),
      style = el("style", css + (extra || "")),
      d = el("dialog"),
      head = el("div", undefined, "top"),
      h = el("h2", title),
      exit = button("×", close, "close");
    exit.setAttribute("aria-label", "Close " + title);
    h.id = "hn-title";
    d.setAttribute("aria-labelledby", h.id);
    head.append(h, exit);
    d.append(head);
    shadow.append(style, d);
    doc.body.append(host);
    var closed = false,
      cleanup = [];
    function close() {
      if (closed) return;
      closed = true;
      cleanup.forEach(function (fn) {
        fn();
      });
      d.close();
      host.remove();
      var target = before && before.isConnected ? before : null;
      if (
        !target &&
        originRoot &&
        originRoot.host &&
        originRoot.host.isConnected
      ) {
        if (focusKey)
          target = Array.from(
            originRoot.querySelectorAll("[data-focus-key]"),
          ).find(function (n) {
            return n.dataset.focusKey === focusKey;
          });
        if (!target) target = originRoot.querySelector("dialog button");
      }
      if (target) target.focus({ preventScroll: true });
    }
    d.addEventListener("cancel", function (e) {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    d.addEventListener("click", function (e) {
      if (e.target === d) {
        var r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          close();
      }
    });
    // Escape belongs to the top dialog, before homepage shortcut handlers.
    function key(e) {
      if (
        e.key === "Tab" &&
        d.open &&
        host === Array.from(doc.querySelectorAll(".hn-dialog-host")).pop()
      ) {
        var controls = Array.from(
          d.querySelectorAll(
            'button,a[href],input,select,textarea,summary,[tabindex="0"]',
          ),
        ).filter(function (n) {
          return (
            !n.disabled &&
            !n.hidden &&
            !n.closest("[hidden],[inert]") &&
            n.getClientRects().length
          );
        });
        var first = controls[0],
          last = controls[controls.length - 1],
          current = shadow.activeElement;
        if (
          !first ||
          (e.shiftKey && (current === first || !d.contains(current))) ||
          (!e.shiftKey && (current === last || !d.contains(current)))
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (first) (e.shiftKey ? last : first).focus();
          else {
            d.tabIndex = -1;
            d.focus();
          }
        }
      }
      if (
        e.key === "Escape" &&
        d.open &&
        host === Array.from(doc.querySelectorAll(".hn-dialog-host")).pop()
      ) {
        if (d.querySelector(".picked")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    }
    doc.addEventListener("keydown", key, true);
    cleanup.push(function () {
      doc.removeEventListener("keydown", key, true);
    });
    return {
      host: host,
      node: d,
      head: head,
      title: h,
      close: close,
      cleanup: cleanup,
      show: function () {
        d.showModal();
      },
    };
  }
  function load() {
    var raw = root.localStorage.getItem(model.key);
    if (!raw) throw new Error("Open Heavenly first to initialize bookmarks.");
    return model.prepare(JSON.parse(raw));
  }
  function open(options) {
    options = options || {};
    var data;
    try {
      data = load();
    } catch (e) {
      root.alert(e.message);
      return;
    }
    var e = options.id && model.entry(data, options.id),
      d = dialog("Quick Save");
    d.host.id = "heavenly-quick-save";
    var body = d.node;
    var name = field(body, "Name", "text", e ? e.title : options.title),
      url = field(body, "URL", "url", e ? e.url : options.url);
    if (e) {
      name.disabled = true;
      url.disabled = true;
    }
    var kind = select(
      body,
      "Save as",
      [
        { id: "bookmark", title: "Bookmark" },
        { id: "game", title: "Personal game" },
      ],
      options.kind === "game" ? "game" : "bookmark",
    );
    if (e) kind.closest("label").hidden = true;
    var search = field(body, "Search collections", "search", "");
    search.placeholder = "Find a destination…";
    search.setAttribute("aria-label", "Search collections");
    var list = el("div", undefined, "list scroll");
    body.append(list);
    var selected =
        options.collectionId || data._collections.collections[0]?.id || "",
      createDraft = false;
    function destinations() {
      list.replaceChildren();
      data._collections.collections
        .filter(function (c) {
          return c.title.toLowerCase().includes(search.value.toLowerCase());
        })
        .forEach(function (c) {
          var label = el(
              "label",
              undefined,
              "destination" + (c.parentId ? " child" : ""),
            ),
            radio = el("input");
          radio.type = "radio";
          radio.name = "destination";
          radio.value = c.id;
          radio.checked = selected === c.id && !createDraft;
          radio.onchange = function () {
            selected = c.id;
            createDraft = false;
            fresh.open = false;
            if (editExisting) {
              editName.value = c.title;
              editIcon.value = c.icon || "✦";
              editExisting.hidden = false;
            }
          };
          var text = el("span", (c.icon || "✦") + " " + c.title);
          if (e && c.itemIds.includes(e.id))
            text.append(el("small", "Already saved"));
          label.append(radio, text);
          list.append(label);
        });
      if (!list.children.length)
        list.append(el("p", "No collections match. Create one below."));
    }
    search.oninput = destinations;
    var fresh = el("details"),
      summary = el("summary", "Create a new collection");
    fresh.append(summary);
    var newName = field(fresh, "Collection name", "text", ""),
      newIcon = field(fresh, "Icon or emoji", "text", "✦"),
      parent = select(
        fresh,
        "Placement",
        [{ id: "", title: "Top level" }].concat(
          data._collections.collections
            .filter(function (c) {
              return !c.parentId;
            })
            .map(function (c) {
              return { id: c.id, title: "Inside " + c.title };
            }),
        ),
        "",
      );
    fresh.ontoggle = function () {
      if (fresh.open) {
        createDraft = true;
        editExisting.open = false;
        destinations();
      }
    };
    body.append(fresh);
    var selectedCollection = data._collections.collections.find(function (c) {
      return c.id === selected;
    });
    var editExisting = el("details");
    editExisting.append(el("summary", "Edit selected collection"));
    var editName = field(
        editExisting,
        "Destination name",
        "text",
        selectedCollection?.title || "",
      ),
      editIcon = field(
        editExisting,
        "Destination icon",
        "text",
        selectedCollection?.icon || "✦",
      );
    editExisting.hidden = !selectedCollection;
    editExisting.ontoggle = function () {
      if (editExisting.open) {
        fresh.open = false;
        createDraft = false;
        destinations();
      }
    };
    body.append(editExisting);
    var status = el("p", "", "status");
    status.setAttribute("role", "status");
    body.append(status);
    var actions = el("div", undefined, "actions");
    actions.append(
      button("Cancel", d.close),
      button(
        "Save",
        function () {
          try {
            var tx = model.transact(root.localStorage, function (latest) {
              return model.quickSave(latest, {
                id: e && e.id,
                title: name.value,
                url: url.value,
                kind: kind.value,
                collectionId: selected,
                collectionEdit:
                  editExisting.open && !fresh.open
                    ? {
                        title: editName.value,
                        icon: editIcon.value,
                        expected: JSON.stringify(
                          data._collections.collections.find(function (c) {
                            return c.id === selected;
                          }),
                        ),
                      }
                    : null,
                newCollection: fresh.open
                  ? {
                      title: newName.value,
                      icon: newIcon.value,
                      parentId: parent.value,
                    }
                  : null,
                moveFrom: options.moveFrom,
              });
            });
            status.classList.remove("error");
            status.textContent = tx.result.already
              ? "Already saved in " + tx.result.collection.title
              : "Saved to " + tx.result.collection.title;
            root.dispatchEvent(
              new root.CustomEvent("heavenly-collections-changed"),
            );
            if (options.onSave) options.onSave(tx);
            var savedText = status.textContent;
            d.close();
            var notice = el("div");
            var isolated = notice.attachShadow({ mode: "open" });
            isolated.append(
              el(
                "style",
                ":host{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#1c3452;color:#eef8ff;border:1px solid #9ad8ec;border-radius:12px;padding:12px 18px;font:14px/1.5 system-ui;max-width:calc(100vw - 30px)}",
              ),
            );
            var message = el("span", savedText);
            message.setAttribute("role", "status");
            isolated.append(message);
            var parentHost = Array.from(
              doc.querySelectorAll(".hn-dialog-host"),
            ).pop();
            var parentDialog =
              parentHost && parentHost.shadowRoot.querySelector("dialog[open]");
            (parentDialog || doc.body).append(notice);
            root.setTimeout(function () {
              notice.remove();
            }, 3000);
          } catch (error) {
            status.classList.add("error");
            status.textContent = error.message;
          }
        },
        "primary",
      ),
    );
    body.append(actions);
    destinations();
    d.show();
    name.focus();
    return d;
  }
  root.HeavenlySaveUI = {
    open: open,
    dialog: dialog,
    el: el,
    button: button,
    field: field,
    select: select,
    load: load,
    css: css,
  };
})(window);
