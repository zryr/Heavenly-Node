/* Heavenly Arcade and Bookmarks use the same identities, memberships and choices. */
(function (root) {
  "use strict";
  var M = root.HeavenlyCollections,
    U = root.HeavenlySaveUI,
    el = U.el,
    button = U.button,
    field = U.field,
    select = U.select;
  var settings = {},
    active = null,
    lastTab = "All",
    lastQuery = "",
    lastCollection = "",
    undoTx = null;
  var css = `dialog.arcade{width:min(1120px,calc(100vw - 24px));padding:26px}.eyebrow{font-size:.73rem;letter-spacing:.14em;text-transform:uppercase;color:#a7c5eb}.arcade-intro{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap}.tabs{display:flex;gap:7px;flex-wrap:wrap;border-bottom:1px solid #344969;padding:12px 0 18px}.tabs button{flex:0 0 auto}.workspace{display:grid;grid-template-columns:var(--collection-width,225px) minmax(0,1fr);gap:22px;margin-top:20px;align-items:start}.sidebar{min-width:0;position:sticky;top:0}.sidebar nav{display:grid;gap:5px;max-height:40vh;overflow:auto;padding:4px}.sidebar nav button{text-align:left;justify-content:start;overflow-wrap:anywhere;min-width:0}.sidebar nav .child{margin-left:14px;font-size:.88rem}.content{min-width:0;container-type:inline-size}.cards{display:grid;grid-template-columns:1fr;gap:12px}.game{border:1px solid #3b5272;border-radius:16px;background:linear-gradient(130deg,#1b2c47,#192238);padding:14px;min-width:0;display:flex;flex-direction:column;gap:8px}.game .info{justify-content:start;text-align:left;border:0;background:none;padding:0;color:#f3f7ff;display:block;min-width:0}.game h3{font-size:1rem;margin-bottom:4px;overflow-wrap:anywhere}.game small{display:block;font-size:.77rem}.game .row{gap:7px;margin-top:auto}.game .play{flex:1}.game .select-item{margin:0}.game.selected{border-color:#b4a2f4;background:#283251}.spotlight{padding:20px;border:1px solid #6c6497;border-radius:18px;background:radial-gradient(ellipse at 100% 0,#4e3a763b,transparent 65%),linear-gradient(110deg,#203b57,#242641);margin-bottom:20px}.spotlight h3{font-size:1.25rem}.spotlight p{margin-bottom:0}.spotlight img{max-width:180px;max-height:100px;object-fit:contain;float:right}.heading{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:0 0 15px}.heading h3{margin:0}.collection-tools{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.collection-tools button{font-size:.8rem;padding:7px 10px}.batch{padding:12px;border:1px solid #7973a5;border-radius:12px;background:#252b48;margin-bottom:14px}.batch .row{margin-top:8px}.drag{font-size:18px;padding:4px;min-width:38px;touch-action:pan-y;cursor:grab;user-select:none}.picked{outline:2px solid #b7a4ff}.drop-target{box-shadow:inset 0 -3px #9de8fa}.grip{letter-spacing:2px}.url{font-size:.8rem;word-break:break-all}.choice{display:flex;align-items:center;gap:10px}.choice input{margin:0}.details-grid{display:grid;gap:12px}.conflict{padding:12px;border:1px solid #4c6285;border-radius:10px;margin:8px 0;font-size:.85rem}.mobile-collections{display:none}.panel-width{font-size:.8rem}.panel-width input{width:100%}@container(min-width:530px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@container(min-width:850px){.cards{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){dialog.arcade{padding:18px}.workspace{grid-template-columns:minmax(0,1fr)}.sidebar{position:static}.sidebar nav{max-height:28vh}.mobile-collections{display:inline-flex}.sidebar[aria-hidden=true]{display:none}.panel-width{display:none}.tabs{gap:6px}.tabs button{font-size:.85rem;padding:8px 10px}}`;
  function curated(data, e) {
    return !!(e.builtIn || data._catalog?.accepted?.["bookmark:" + e.id]);
  }
  function announce(text, error) {
    if (active) {
      active.status.textContent = text;
      active.status.classList.toggle("error", !!error);
    }
  }
  function mutate(fn, message, undoable) {
    try {
      var tx = M.transact(root.localStorage, fn);
      if (undoable) undoTx = tx;
      root.dispatchEvent(new root.CustomEvent("heavenly-collections-changed"));
      if (active) render();
      announce(message || "Saved.");
      return tx;
    } catch (e) {
      announce(e.message, true);
      return null;
    }
  }
  function newTab(url) {
    return root.HeavenlyNavigation.launch(root, url, {
      settings: settings.readSettings
        ? settings.readSettings()
        : root.HeavenlyNavigation.readSettings(root.localStorage),
      kind: "bookmark",
      newTab: true,
    });
  }
  function launch(id) {
    try {
      var data = U.load(),
        e = M.entry(data, id),
        p = M.preference(data, id);
      if (!e) throw new Error("This game is no longer available.");
      var mirrors = root.HeavenlyBookmarks.mirrorState(
          e,
          e.url,
          e.title,
          settings.broken ? settings.broken() : {},
        ),
        url = mirrors.active ? M.safeUrl(mirrors.active.url) : M.safeUrl(e.url);
      if (!url)
        throw new Error(
          "This destination is unsupported. Edit its URL to use http or https.",
        );
      var target =
        p.mode === "direct" ? url : root.location.origin + "/proxy/" + url;
      var result = settings.launch
        ? settings.launch(target, p.newTab)
        : root.HeavenlyNavigation.launch(root, target, {
            kind: "bookmark",
            newTab: p.newTab,
          });
      if (result === false)
        throw new Error(
          "Your browser blocked the launch. Try New Tab or Direct.",
        );
      announce(
        "Opening " +
          e.title +
          ". Availability depends on the website and your network.",
      );
    } catch (e) {
      announce(e.message, true);
    }
  }
  function favorite(id) {
    var tx = mutate(function (data) {
      var p = M.preference(data, id);
      M.setPreference(data, id, { favorite: !p.favorite });
      return !p.favorite;
    });
    if (tx)
      announce(tx.result ? "Added to Favorites." : "Removed from Favorites.");
  }
  function editor(id, kind) {
    var data = U.load(),
      e = id && M.entry(data, id),
      d = U.dialog(
        e
          ? "Edit " + e.title
          : kind === "bookmark"
            ? "Add personal bookmark"
            : "Add personal game",
      ),
      body = d.node;
    var name = field(body, "Name", "text", e && e.title),
      url = field(body, "URL", "url", e && e.url),
      description = field(body, "Description", "textarea", e && e.description),
      image = field(body, "Icon or emoji", "text", (e && e.icon) || "✦"),
      note = field(body, "Personal note", "textarea", e && e.personalNote),
      mode = select(
        body,
        "Preferred launch",
        [
          { id: "proxy", title: "Proxy" },
          { id: "direct", title: "Direct" },
        ],
        e ? M.preference(data, e.id).mode : "proxy",
      );
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
            var tx = M.transact(root.localStorage, function (latest) {
              var item;
              if (
                e &&
                JSON.stringify(M.entry(latest, e.id)) !== JSON.stringify(e)
              )
                throw new Error(
                  "This item changed in another tab. Your draft is kept here; reopen the item to review saved changes.",
                );
              if (e && curated(latest, e)) {
                item = M.entry(latest, e.id);
                if (!item) throw new Error("Item no longer exists.");
                if (!M.safeUrl(url.value) || !name.value.trim())
                  throw new Error("Enter a name and a complete safe URL.");
                item.title = name.value.trim().slice(0, 160);
                item.url = M.safeUrl(url.value);
                item.description = description.value.slice(0, 2000);
                item.icon = image.value.slice(0, 2048);
              } else
                item = M.saveItem(latest, {
                  id: id,
                  kind: kind || e.kind || "game",
                  title: name.value,
                  url: url.value,
                  description: description.value,
                  icon: image.value,
                  mode: mode.value,
                });
              item.personalNote = note.value.slice(0, 4000);
              M.setPreference(latest, item.id, { mode: mode.value });
              return item;
            });
            d.close();
            root.dispatchEvent(
              new root.CustomEvent("heavenly-collections-changed"),
            );
            render();
            announce("Saved " + tx.result.title + ".");
          } catch (e) {
            status.textContent = e.message;
            status.classList.add("error");
          }
        },
        "primary",
      ),
    );
    body.append(actions);
    d.show();
    name.focus();
  }
  function details(id) {
    var data = U.load(),
      e = M.entry(data, id);
    if (!e) return;
    var p = M.preference(data, id),
      d = U.dialog(e.title, css),
      body = d.node;
    d.host.id = "heavenly-game-details";
    body.append(
      el(
        "p",
        curated(data, e)
          ? "Curated catalog entry · Personal choices are kept through updates."
          : "Personal entry · Your saved game or bookmark.",
        "muted",
      ),
    );
    if (e.description) body.append(el("p", e.description));
    var url = el("a", e.url, "url");
    url.href = M.safeUrl(e.url);
    url.target = "_blank";
    url.rel = "noopener noreferrer";
    body.append(url);
    var choice = select(
      body,
      "Launch method for this item",
      [
        { id: "proxy", title: "Proxy" },
        { id: "direct", title: "Direct" },
      ],
      p.mode,
    );
    choice.onchange = function () {
      try {
        M.transact(root.localStorage, function (data) {
          M.setPreference(data, id, { mode: choice.value });
        });
        render();
        status.textContent = "Launch method saved for this item.";
      } catch (e) {
        status.textContent = e.message;
      }
    };
    var label = el("label", undefined, "choice"),
      tab = el("input");
    tab.type = "checkbox";
    tab.checked = p.newTab;
    tab.onchange = function () {
      try {
        M.transact(root.localStorage, function (data) {
          M.setPreference(data, id, { newTab: tab.checked });
        });
        status.textContent = "New Tab preference saved.";
      } catch (e) {
        status.textContent = e.message;
      }
    };
    label.append(
      tab,
      el("span", "New Tab (otherwise follow bookmark settings)"),
    );
    body.append(label);
    body.append(
      el(
        "p",
        "Direct opens the original site. Proxy uses Heavenly. Some websites reject framing or may be unavailable; try Direct or New Tab.",
        "muted",
      ),
    );
    var membership = M.memberships(data, id);
    body.append(
      el(
        "p",
        "Collections: " +
          (membership.length
            ? membership
                .map(function (c) {
                  return c.title;
                })
                .join(", ")
            : "Unfiled"),
        "muted",
      ),
    );
    if (e.personalNote) body.append(el("p", e.personalNote));
    var mirrors = root.HeavenlyBookmarks.mirrorState(
      e,
      e.url,
      e.title,
      settings.broken ? settings.broken() : {},
    );
    if (mirrors.entries.length > 1) {
      var panel = el("details"),
        summary = el("summary", "Mirrors and alternate sources");
      panel.append(summary);
      mirrors.entries.forEach(function (m) {
        var row = el("p"),
          a = el(
            "a",
            (m.title || m.url) + (m.isBroken ? " · Reported broken" : ""),
          );
        a.href = M.safeUrl(m.url);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        row.append(a);
        panel.append(row);
      });
      if (settings.mirrors)
        panel.append(
          button("Manage mirror preferences", function () {
            d.close();
            settings.mirrors(e);
          }),
        );
      body.append(panel);
    }
    if (settings.mirrors)
      body.append(
        button("Saved links, mirrors and recovery", function () {
          d.close();
          if (active) active.d.close();
          settings.mirrors(e);
        }),
      );
    var aliases = Object.keys(data._collections.aliases).filter(
      function (alias) {
        return data._collections.aliases[alias] === id;
      },
    );
    if (aliases.length) {
      var legacy = el("details");
      legacy.append(
        el("summary", "Legacy saved versions (" + aliases.length + ")"),
      );
      aliases.forEach(function (alias) {
        var original = M.index(data)[alias];
        if (!original) return;
        var row = el("div", undefined, "conflict");
        row.append(
          el("strong", original.title),
          el("p", original.url),
          el("p", original.personalNote || "No personal note"),
          el(
            "p",
            "Original launch choice: " +
              (original.launchPreference || "inherited"),
          ),
        );
        row.append(
          button("Keep as separate item", function () {
            if (
              mutate(
                function (latest) {
                  M.separateAlias(latest, alias);
                },
                "Legacy version restored as a separate item.",
                true,
              )
            )
              d.close();
          }),
        );
        legacy.append(row);
      });
      body.append(legacy);
    }
    var vus = el("details");
    vus.append(
      el("summary", "VUS · HTML Viewer launcher"),
      el(
        "p",
        "Use the existing Launch VUS control in HTML Viewer. It tries the upstream source, Proxy, then the local fallback in an isolated preview.",
        "muted",
      ),
    );
    var link = el("a", "Open HTML Viewer · VUS", "button");
    link.href = "/html-viewer.html#btn-vus";
    link.target = "_blank";
    link.rel = "noopener";
    vus.append(link);
    body.append(vus);
    var status = el("p", "", "status");
    status.setAttribute("role", "status");
    body.append(status);
    var actions = el("div", undefined, "actions"),
      fav = button(p.favorite ? "★ Favorited" : "☆ Favorite", function () {
        favorite(id);
        p = M.preference(U.load(), id);
        fav.textContent = p.favorite ? "★ Favorited" : "☆ Favorite";
        fav.setAttribute("aria-pressed", String(p.favorite));
      });
    fav.setAttribute("aria-pressed", String(p.favorite));
    actions.append(
      button("Edit", function () {
        d.close();
        editor(
          id,
          data._collections.gameIds.includes(id) ? "game" : "bookmark",
        );
      }),
      fav,
      button("Save to collection", function () {
        U.open({
          id: id,
          onSave: function () {
            render();
          },
        });
      }),
      button(
        "Play",
        function () {
          launch(id);
        },
        "primary",
      ),
    );
    if (!curated(data, e))
      actions.append(
        button("Remove personal item", function () {
          var confirm = U.dialog("Remove personal item?");
          confirm.node.append(
            el(
              "p",
              "This removes the personal record and its collection memberships. You can Undo from Arcade.",
            ),
          );
          confirm.node.append(
            button("Cancel", confirm.close),
            button("Remove", function () {
              if (
                mutate(
                  function (latest) {
                    function remove(list) {
                      return list
                        .filter(function (x) {
                          return x.id !== id;
                        })
                        .map(function (x) {
                          if (x.subBookmarks)
                            x.subBookmarks = remove(x.subBookmarks);
                          return x;
                        });
                    }
                    latest.bookmarks = remove(latest.bookmarks);
                    latest._collections.collections.forEach(function (c) {
                      c.itemIds = c.itemIds.filter(function (i) {
                        return i !== id;
                      });
                    });
                  },
                  "Personal item removed.",
                  true,
                )
              ) {
                confirm.close();
                d.close();
              }
            }),
          );
          confirm.show();
        }),
      );
    body.append(actions);
    d.show();
  }
  function collectionEditor(id) {
    var data = U.load(),
      c =
        id &&
        data._collections.collections.find(function (c) {
          return c.id === id;
        }),
      d = U.dialog(c ? "Edit collection" : "New collection"),
      name = field(d.node, "Collection name", "text", c && c.title),
      icon = field(d.node, "Icon or emoji", "text", (c && c.icon) || "✦");
    var parents = data._collections.collections.filter(function (p) {
      return (
        !p.parentId &&
        p.id !== id &&
        !(
          c &&
          data._collections.collections.some(function (child) {
            return child.parentId === id;
          })
        )
      );
    });
    var parent = select(
      d.node,
      "Placement",
      [{ id: "", title: "Top level" }].concat(
        parents.map(function (c) {
          return { id: c.id, title: "Inside " + c.title };
        }),
      ),
      (c && c.parentId) || "",
    );
    var status = el("p", "", "status");
    status.setAttribute("role", "status");
    d.node.append(status);
    var actions = el("div", undefined, "actions");
    actions.append(
      button("Cancel", d.close),
      button(
        "Save",
        function () {
          try {
            var tx = M.transact(root.localStorage, function (data) {
              if (
                c &&
                JSON.stringify(
                  data._collections.collections.find(function (entry) {
                    return entry.id === id;
                  }),
                ) !== JSON.stringify(c)
              )
                throw new Error(
                  "This collection changed in another tab. Your draft is kept here; reopen to review saved changes.",
                );
              return c
                ? M.edit(data, id, {
                    title: name.value,
                    icon: icon.value,
                    parentId: parent.value,
                  })
                : M.create(data, {
                    title: name.value,
                    icon: icon.value,
                    parentId: parent.value,
                  });
            });
            lastCollection = tx.result.id;
            d.close();
            render();
            root.dispatchEvent(
              new root.CustomEvent("heavenly-collections-changed"),
            );
          } catch (e) {
            status.textContent = e.message;
            status.classList.add("error");
          }
        },
        "primary",
      ),
    );
    d.node.append(actions);
    d.show();
    name.focus();
  }
  function deleteCollection(id) {
    var d = U.dialog("Delete collection?");
    d.node.append(
      el(
        "p",
        "Games and bookmarks stay saved. Only this collection and its memberships are removed; child folders become top-level collections. Undo is available.",
      ),
    );
    var actions = el("div", undefined, "actions");
    actions.append(
      button("Cancel", d.close),
      button(
        "Delete collection",
        function () {
          if (
            mutate(
              function (data) {
                M.deleteCollection(data, id);
              },
              "Collection deleted. Items are still available in All.",
              true,
            )
          ) {
            lastCollection = "";
            d.close();
            render();
          }
        },
        "primary",
      ),
    );
    d.node.append(actions);
    d.show();
  }
  function mergeCollections(source) {
    var data = U.load(),
      d = U.dialog("Merge collections", css),
      destination = select(
        d.node,
        "Destination",
        data._collections.collections
          .filter(function (c) {
            return c.id !== source;
          })
          .map(function (c) {
            return { id: c.id, title: c.title };
          }),
      ),
      preview = el("div"),
      order = select(d.node, "Order", [
        { id: "destination", title: "Destination first; append source" },
        { id: "source", title: "Source first; append destination" },
      ]),
      removeLabel = el("label"),
      remove = el("input");
    remove.type = "checkbox";
    removeLabel.append(
      remove,
      el("span", " Delete source collection after merging (items stay saved)"),
    );
    d.node.append(removeLabel, preview);
    var status = el("p", "", "status");
    status.setAttribute("role", "status");
    d.node.append(status);
    function review() {
      preview.replaceChildren();
      if (!destination.value) {
        preview.append(el("p", "Create another collection to merge into."));
        return;
      }
      var p = M.conflicts(data, source, destination.value);
      preview.append(
        el("h3", p.source + " → " + p.destination),
        el(
          "p",
          p.sourceCount +
            " + " +
            p.destinationCount +
            " memberships → " +
            p.resultCount +
            " unique items. Destination name and icon stay. Shared identities appear once; different pages and ambiguous sources are retained.",
        ),
      );
      p.conflicts.forEach(function (c) {
        var row = el("div", undefined, "conflict");
        row.append(
          el("strong", c.relation),
          el("p", c.leftTitle + " · " + c.leftUrl),
          el("p", c.rightTitle + " · " + c.rightUrl),
          el(
            "p",
            "Notes: " +
              (c.leftNote || "none") +
              " / " +
              (c.rightNote || "none"),
          ),
          el(
            "p",
            "Preferences retained: " +
              c.leftPreference.mode +
              " / " +
              c.rightPreference.mode +
              " · Favorites " +
              c.leftPreference.favorite +
              " / " +
              c.rightPreference.favorite,
          ),
        );
        var retained = el("details"),
          columns = el("div", undefined, "split");
        retained.append(
          el("summary", "Review retained icons, mirrors and memberships"),
        );
        ["left", "right"].forEach(function (side) {
          var column = el("section");
          column.append(
            el("h4", c[side + "Title"]),
            el("p", "Icon: " + (c[side + "Icon"] || "default")),
            el("p", "Collections: " + c[side + "Collections"].join(", ")),
          );
          c[side + "Mirrors"].forEach(function (m) {
            column.append(el("p", (m.title || "Alternate URL") + ": " + m.url));
          });
          columns.append(column);
        });
        retained.append(columns);
        row.append(retained);
        preview.append(row);
      });
    }
    destination.onchange = review;
    review();
    var actions = el("div", undefined, "actions");
    actions.append(
      button("Cancel", d.close),
      button(
        "Merge — retain distinct items",
        function () {
          if (
            mutate(
              function (latest) {
                if (
                  JSON.stringify(
                    M.conflicts(latest, source, destination.value),
                  ) !==
                  JSON.stringify(M.conflicts(data, source, destination.value))
                )
                  throw new Error(
                    "These collections changed. Close and reopen the merge preview before applying it.",
                  );
                M.merge(latest, source, destination.value, {
                  sourceFirst: order.value === "source",
                  removeSource: remove.checked,
                });
              },
              "Collections merged. Distinct records and preferences were retained.",
              true,
            )
          ) {
            lastCollection = destination.value;
            d.close();
            render();
          }
        },
        "primary",
      ),
    );
    d.node.append(actions);
    d.show();
  }
  // Pointer hold belongs only to the four-dot handle. Before pickup, movement
  // is native scrolling; every terminal path releases timers/listeners/state.
  function drag(handle, row, id, scope, container) {
    handle.setAttribute(
      "aria-label",
      "Reorder " +
        (row.dataset.title || "item") +
        "; use Move up/down buttons for keyboard",
    );
    handle.addEventListener("pointerdown", function (start) {
      if (start.button !== 0) return;
      var activeDrag = false,
        timer,
        target = null,
        startY = start.clientY,
        startX = start.clientX,
        done = false;
      function cleanup() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        row.classList.remove("picked");
        if (target) target.classList.remove("drop-target");
        root.removeEventListener("pointermove", move, true);
        root.removeEventListener("touchmove", touchMove, true);
        root.removeEventListener("pointerup", end, true);
        root.removeEventListener("pointercancel", cancel, true);
        root.removeEventListener("blur", cancel);
        root.document.removeEventListener("keydown", key, true);
        observer.disconnect();
      }
      function touchMove(e) {
        if (activeDrag && e.cancelable) e.preventDefault();
      }
      function cancel() {
        cleanup();
      }
      function key(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          cancel();
        }
      }
      function move(e) {
        if (e.pointerId !== start.pointerId) return;
        if (!activeDrag) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) cleanup();
          return;
        }
        e.preventDefault();
        var node = container
          .getRootNode()
          .elementFromPoint(e.clientX, e.clientY);
        if (target) target.classList.remove("drop-target");
        target = node && node.closest("[data-sort-id]");
        if (target === row || target?.parentNode !== row.parentNode)
          target = null;
        if (target) target.classList.add("drop-target");
      }
      function end(e) {
        if (e.pointerId !== start.pointerId) return;
        var targetId = activeDrag && target && target.dataset.sortId;
        cleanup();
        if (targetId)
          mutate(function (data) {
            var list = scope
              ? data._collections.collections.find(function (c) {
                  return c.id === scope;
                }).itemIds
              : data._collections.collections.map(function (c) {
                  return c.id;
                });
            M.reorder(
              data,
              scope,
              id,
              list.indexOf(targetId) - list.indexOf(id),
            );
          }, "Order saved.");
      }
      var observer = new MutationObserver(function () {
        if (!handle.isConnected) cancel();
      });
      observer.observe(root.document.body, { childList: true, subtree: true });
      root.addEventListener("pointermove", move, {
        capture: true,
        passive: false,
      });
      root.addEventListener("touchmove", touchMove, {
        capture: true,
        passive: false,
      });
      root.addEventListener("pointerup", end, true);
      root.addEventListener("pointercancel", cancel, true);
      root.addEventListener("blur", cancel);
      root.document.addEventListener("keydown", key, true);
      timer = setTimeout(
        function () {
          if (!handle.isConnected) return cleanup();
          activeDrag = true;
          row.classList.add("picked");
        },
        start.pointerType === "mouse" ? 90 : 420,
      );
      if (active) active.cleanupGestures.push(cleanup);
    });
  }
  function render() {
    if (!active) return;
    active.cleanupGestures.splice(0).forEach(function (fn) {
      fn();
    });
    var data;
    try {
      data = U.load();
    } catch (e) {
      announce(e.message, true);
      return;
    }
    var recordIndex = M.index(data),
      contexts = Object.create(null);
    data._collections.collections.forEach(function (c) {
      c.itemIds.forEach(function (id) {
        if (!contexts[id]) contexts[id] = [];
        contexts[id].push(c.title);
      });
    });
    var a = active,
      rootNode = a.body,
      focused = a.d.host.shadowRoot.activeElement,
      focusKey = focused && focused.dataset.focusKey;
    rootNode.replaceChildren();
    var collection = data._collections.collections.find(function (c) {
      return c.id === lastCollection;
    });
    if (!collection) lastCollection = "";
    var all = M.items(data, a.bookmarks ? "bookmark" : "game");
    var intro = el("div", undefined, "arcade-intro"),
      introCopy = el("div");
    introCopy.append(
      el(
        "span",
        a.bookmarks ? "Your links, together" : "A little escape, close to home",
        "eyebrow",
      ),
      el(
        "p",
        a.bookmarks
          ? "One item can live in several collections."
          : "Your games, favorite corners, and next little obsession.",
      ),
    );
    var topActions = el("div", undefined, "row");
    topActions.append(
      button(a.bookmarks ? "Add bookmark" : "Add game", function () {
        editor(null, a.bookmarks ? "bookmark" : "game");
      }),
      button("New collection", function () {
        collectionEditor();
      }),
    );
    var undo = button("Undo", function () {
      try {
        M.undo(root.localStorage, undoTx);
        undoTx = null;
        root.dispatchEvent(
          new root.CustomEvent("heavenly-collections-changed"),
        );
        render();
        announce("Previous arrangement restored.");
      } catch (e) {
        announce(e.message, true);
      }
    });
    undo.disabled = !undoTx;
    topActions.append(undo);
    intro.append(introCopy, topActions);
    rootNode.append(intro);
    var tabs = el("div", undefined, "tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute(
      "aria-label",
      a.bookmarks ? "Bookmark filters" : "Arcade categories",
    );
    (a.bookmarks
      ? ["All", "Favorites"]
      : ["All", "Featured", "Newgrounds", "General", "Favorites"]
    ).forEach(function (name, i) {
      var b = button(name, function () {
        lastTab = name;
        lastCollection = "";
        a.selected.clear();
        render();
        a.d.host.shadowRoot
          .querySelector("[role=tab][aria-selected=true]")
          .focus();
      });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(lastTab === name));
      b.tabIndex = lastTab === name ? 0 : -1;
      b.onkeydown = function (e) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          var list = Array.from(tabs.children),
            at =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? list.length - 1
                  : (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) %
                    list.length;
          list[at].click();
        }
      };
      tabs.append(b);
    });
    rootNode.append(tabs);
    var search = field(
      rootNode,
      "Search " +
        (a.bookmarks ? "bookmarks and collections" : "games and collections"),
      "search",
      lastQuery,
    );
    search.dataset.focusKey = "search";
    search.oninput = function () {
      lastQuery = search.value;
      render();
    };
    var workspace = el("div", undefined, "workspace");
    workspace.style.setProperty(
      "--collection-width",
      (data._collections.panelWidth || 225) + "px",
    );
    var sidebar = el("aside", undefined, "sidebar"),
      toggle = button(
        "Collections",
        function () {
          a.mobileOpen = !a.mobileOpen;
          sidebar.setAttribute("aria-hidden", String(!a.mobileOpen));
          toggle.setAttribute("aria-expanded", String(a.mobileOpen));
        },
        "mobile-collections",
      );
    toggle.setAttribute("aria-expanded", String(a.mobileOpen));
    rootNode.append(toggle);
    if (root.innerWidth <= 700)
      sidebar.setAttribute("aria-hidden", String(!a.mobileOpen));
    sidebar.append(el("h3", "Collections"));
    var navigation = el("nav");
    navigation.setAttribute("aria-label", "Saved collections");
    var collQuery = lastQuery.toLowerCase();
    data._collections.collections.forEach(function (c) {
      if (
        collQuery &&
        !c.title.toLowerCase().includes(collQuery) &&
        !c.itemIds.some(function (id) {
          var e = recordIndex[id];
          return e && (e.title + " " + e.url).toLowerCase().includes(collQuery);
        })
      )
        return;
      var row = el("div", undefined, "row" + (c.parentId ? " child" : ""));
      row.dataset.sortId = c.id;
      row.dataset.title = c.title;
      var b = button((c.icon || "✦") + " " + c.title, function () {
        lastCollection = c.id;
        lastQuery = "";
        a.selected.clear();
        render();
      });
      b.style.flex = "1";
      b.setAttribute("aria-pressed", String(lastCollection === c.id));
      var grip = button("⠶", function () {}, "drag");
      row.append(grip, b);
      var moves = el("div", undefined, "collection-tools");
      [-1, 1].forEach(function (delta) {
        var move = button(delta < 0 ? "↑" : "↓", function () {
          mutate(function (d) {
            M.reorder(d, null, c.id, delta);
          }, "Collection order saved.");
        });
        move.setAttribute(
          "aria-label",
          (delta < 0 ? "Move collection up " : "Move collection down ") +
            c.title,
        );
        moves.append(move);
      });
      row.append(moves);
      drag(grip, row, c.id, null, navigation);
      navigation.append(row);
    });
    if (!navigation.children.length)
      navigation.append(el("p", "No matching collections.", "muted"));
    sidebar.append(navigation);
    var width = field(
      sidebar,
      "Collection panel width",
      "range",
      data._collections.panelWidth || 225,
    );
    width.min = 170;
    width.max = 330;
    width.closest("label").className = "panel-width";
    width.oninput = function () {
      workspace.style.setProperty("--collection-width", width.value + "px");
    };
    width.onchange = function () {
      mutate(function (d) {
        d._collections.panelWidth = Number(width.value);
      }, "Panel width saved.");
    };
    workspace.append(sidebar);
    var content = el("section", undefined, "content");
    content.setAttribute("role", "tabpanel");
    content.setAttribute("aria-label", collection ? collection.title : lastTab);
    workspace.append(content);
    rootNode.append(workspace);
    var picks = ((root.HeavenlyPicks && root.HeavenlyPicks.items) || []).filter(
      function (p) {
        return p.enabled && M.safeUrl(p.url);
      },
    );
    var pickIds = new Set(
      picks
        .map(function (p) {
          var match = all.find(function (e) {
            return e.id === p.id || M.urlKey(e.url) === M.urlKey(p.url);
          });
          return match && match.id;
        })
        .filter(Boolean),
    );
    if (
      !a.bookmarks &&
      !collection &&
      ["All", "Featured"].includes(lastTab) &&
      !lastQuery
    ) {
      var spot = el("div", undefined, "spotlight");
      spot.append(
        el("span", "Handpicked for Heavenly", "eyebrow"),
        el("h3", "Syshi's Picks"),
      );
      if (!picks.length)
        spot.append(
          el(
            "p",
            "Coming Soon · Newgrounds recommendations are being chosen. Explore the catalog below.",
          ),
        );
      else
        picks.forEach(function (p) {
          var found = all.find(function (e) {
            return e.id === p.id || M.urlKey(e.url) === M.urlKey(p.url);
          });
          if (found)
            spot.append(
              button(p.title, function () {
                details(found.id);
              }),
            );
        });
      content.append(spot);
    }
    var heading = el("div", undefined, "heading");
    heading.append(
      el(
        "h3",
        collection
          ? collection.title
          : lastTab === "All"
            ? "Explore " + (a.bookmarks ? "bookmarks" : "games")
            : lastTab,
      ),
    );
    content.append(heading);
    if (collection) {
      var controls = el("div", undefined, "collection-tools");
      controls.append(
        button("Edit", function () {
          collectionEditor(collection.id);
        }),
        button("Merge", function () {
          mergeCollections(collection.id);
        }),
        button("Delete", function () {
          deleteCollection(collection.id);
        }),
        button("Move collection up", function () {
          mutate(function (d) {
            M.reorder(d, null, collection.id, -1);
          });
        }),
        button("Move collection down", function () {
          mutate(function (d) {
            M.reorder(d, null, collection.id, 1);
          });
        }),
        button(
          collection.collapsed ? "Expand items" : "Collapse items",
          function () {
            mutate(function (d) {
              d._collections.collections.find(function (c) {
                return c.id === collection.id;
              }).collapsed = !collection.collapsed;
            });
          },
        ),
      );
      content.append(controls);
    }
    all.sort(function (a, b) {
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
    var gameMap = new Map(
        all.map(function (e) {
          return [e.id, e];
        }),
      ),
      shown = collection
        ? collection.itemIds
            .map(function (id) {
              return gameMap.get(id);
            })
            .filter(Boolean)
        : all;
    if (!collection) {
      if (lastTab === "Favorites")
        shown = shown.filter(function (e) {
          return M.preference(data, e.id).favorite;
        });
      if (lastTab === "Featured")
        shown = shown.filter(function (e) {
          return pickIds.has(e.id) || e.featured === true;
        });
      if (lastTab === "Newgrounds") shown = shown.filter(isNewgrounds);
      if (lastTab === "General")
        shown = shown.filter(function (e) {
          return !isNewgrounds(e);
        });
    }
    var words = lastQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    shown = shown.filter(function (e) {
      var context = (contexts[e.id] || []).join(" "),
        hay = (
          e.title +
          " " +
          e.url +
          " " +
          (e.description || "") +
          " " +
          context
        ).toLowerCase();
      return words.every(function (w) {
        return hay.includes(w);
      });
    });
    heading.append(
      el("small", shown.length + " " + (shown.length === 1 ? "item" : "items")),
    );
    if (a.selected.size) {
      var batch = el("div", undefined, "batch");
      batch.append(el("strong", a.selected.size + " selected"));
      var dest = select(
          batch,
          "Destination",
          data._collections.collections.map(function (c) {
            return { id: c.id, title: c.title };
          }),
        ),
        actions = el("div", undefined, "row");
      actions.append(
        button("Add to another", function () {
          mutate(
            function (d) {
              M.add(d, dest.value, Array.from(a.selected));
            },
            "Added; original memberships kept.",
            true,
          );
        }),
        button("Move", function () {
          if (!collection)
            return announce(
              "Open a collection before moving its memberships.",
              true,
            );
          mutate(
            function (d) {
              M.add(d, dest.value, Array.from(a.selected), collection.id);
            },
            "Memberships moved.",
            true,
          );
        }),
        button("Remove from this collection", function () {
          if (!collection) return;
          mutate(
            function (d) {
              M.remove(d, collection.id, Array.from(a.selected));
            },
            "Memberships removed; items kept.",
            true,
          );
        }),
        button("Clear selection", function () {
          a.selected.clear();
          render();
        }),
      );
      batch.append(actions);
      content.append(batch);
    }
    if (collection?.collapsed && !lastQuery) {
      content.append(
        el(
          "p",
          "Items are collapsed. They remain available in search.",
          "empty",
        ),
      );
      return;
    }
    var cards = el("div", undefined, "cards");
    content.append(cards);
    shown.forEach(function (e) {
      var p = M.preference(data, e.id),
        row = el(
          "article",
          undefined,
          "game" + (a.selected.has(e.id) ? " selected" : ""),
        );
      row.dataset.itemId = e.id;
      row.dataset.sortId = e.id;
      row.dataset.title = e.title;
      var top = el("div", undefined, "row"),
        check = el("input");
      check.type = "checkbox";
      check.className = "select-item";
      check.checked = a.selected.has(e.id);
      check.setAttribute("aria-label", "Select " + e.title);
      check.dataset.focusKey = "select:" + e.id;
      check.onchange = function () {
        if (check.checked) a.selected.add(e.id);
        else a.selected.delete(e.id);
        render();
      };
      top.append(check);
      if (collection) {
        var grip = button("⠶", function () {}, "drag");
        top.append(grip);
        drag(grip, row, e.id, collection.id, cards);
      }
      var info = button(
        "",
        function () {
          details(e.id);
        },
        "info",
      );
      info.append(
        el("h3", e.title),
        el(
          "small",
          (curated(data, e) ? "Curated" : "Personal") +
            " · " +
            (isNewgrounds(e) ? "Newgrounds" : "General"),
        ),
      );
      info.style.flex = "1";
      info.dataset.focusKey = "info:" + e.id;
      top.append(info);
      row.append(top);
      var actions = el("div", undefined, "row"),
        fav = button(p.favorite ? "★" : "☆", function () {
          favorite(e.id);
        });
      fav.setAttribute(
        "aria-label",
        (p.favorite ? "Unfavorite " : "Favorite ") + e.title,
      );
      fav.setAttribute("aria-pressed", String(p.favorite));
      fav.dataset.focusKey = "favorite:" + e.id;
      var play = button(
        "Play · " + (p.mode === "direct" ? "Direct" : "Proxy"),
        function () {
          launch(e.id);
        },
        "primary play",
      );
      play.dataset.focusKey = "play:" + e.id;
      play.setAttribute("aria-label", "Play " + e.title + " with " + p.mode);
      actions.append(
        play,
        fav,
        button("Save", function () {
          U.open({ id: e.id, onSave: render });
        }),
      );
      row.append(actions);
      if (collection) {
        var moves = el("div", undefined, "row");
        [-1, 1].forEach(function (delta) {
          var b = button(delta < 0 ? "Move up" : "Move down", function () {
            mutate(function (d) {
              M.reorder(d, collection.id, e.id, delta);
            }, "Order saved.");
          });
          b.setAttribute(
            "aria-label",
            (delta < 0 ? "Move up " : "Move down ") + e.title,
          );
          moves.append(b);
        });
        row.append(moves);
      }
      cards.append(row);
    });
    if (!shown.length)
      cards.append(
        el(
          "p",
          lastTab === "Favorites"
            ? "No favorites yet. Choose ☆ on any game or personal entry."
            : lastTab === "Featured"
              ? "Syshi's Picks are Coming Soon. Explore All to find a game."
              : "No matching items. Try another search or add a personal entry.",
          "empty",
        ),
      );
    if (focusKey) {
      var target = Array.from(
        a.d.host.shadowRoot.querySelectorAll("[data-focus-key]"),
      ).find(function (n) {
        return n.dataset.focusKey === focusKey;
      });
      if (target) {
        var at = focused.selectionStart;
        target.focus({ preventScroll: true });
        if (target.type === "search" && at !== null)
          target.setSelectionRange(at, at);
      }
    }
  }
  function isNewgrounds(e) {
    try {
      return /(^|\.)newgrounds\.com$/i.test(new URL(e.url).hostname);
    } catch (e) {
      return false;
    }
  }
  function open(options) {
    options = options || {};
    if (active) {
      active.d.close();
      active = null;
    }
    try {
      settings.initialize && settings.initialize();
      var tx = M.transact(root.localStorage, function () {});
    } catch (e) {
      root.alert(e.message);
      return;
    }
    var d = U.dialog(
      options.bookmarks ? "Collections" : "Heavenly Arcade",
      css,
    );
    d.host.id = "heavenly-arcade";
    d.node.classList.add("arcade");
    var body = el("div"),
      status = el("p", "", "status");
    status.setAttribute("role", "status");
    d.node.append(body, status);
    if (options.bookmarks && !["All", "Favorites"].includes(lastTab))
      lastTab = "All";
    active = {
      d: d,
      body: body,
      status: status,
      bookmarks: !!options.bookmarks,
      isNarrow: root.innerWidth <= 700,
      selected: new Set(),
      mobileOpen: false,
      cleanupGestures: [],
    };
    var state = active;
    d.cleanup.push(function () {
      state.cleanupGestures.forEach(function (fn) {
        fn();
      });
      if (active === state) active = null;
    });
    render();
    d.show();
    return d;
  }
  function installEntry(card, cat) {
    if (cat.id !== "cat_games") return;
    var content = card.querySelector(".category-content");
    if (!content) return;
    content.replaceChildren();
    var openButton = button(
      "✦ Heavenly Arcade",
      function () {
        open();
      },
      "heavenly-collection-button is-primary",
    );
    openButton.style.width = "100%";
    openButton.style.marginBottom = "10px";
    openButton.setAttribute("aria-label", "Games · Open Heavenly Arcade");
    var text = el(
      "p",
      "Explore games, Favorites, and your Collections.",
      "heavenly-collection-intro",
    );
    content.append(openButton, text);
    var add = card.querySelector(".btn-add-bm-quick");
    if (add) {
      add.onclick = function () {
        open();
        editor(null, "game");
      };
      add.setAttribute("aria-label", "Add personal game");
    }
    var heading = card.querySelector(".category-title");
    if (heading) {
      heading.tabIndex = 0;
      heading.setAttribute("role", "button");
      heading.setAttribute("aria-label", "Games · Open Heavenly Arcade");
      heading.onclick = function () {
        open();
      };
      heading.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      };
    }
  }
  root.addEventListener("storage", function (e) {
    if (active && e.key === M.key) render();
  });
  root.addEventListener("resize", function () {
    if (active && active.isNarrow !== root.innerWidth <= 700) {
      active.isNarrow = root.innerWidth <= 700;
      render();
    }
  });
  root.HeavenlyArcade = {
    open: open,
    play: launch,
    details: details,
    installEntry: installEntry,
    configure: function (options) {
      settings = options || {};
    },
    refresh: render,
  };
})(window);
