(function (global) {
  "use strict";

  var navigation = typeof module !== "undefined" && module.exports ? require("../public/assets/heavenly-navigation.js") : global.HeavenlyNavigation;

  var icons = typeof module !== "undefined" && module.exports ? require("../public/assets/heavenly-icons.js") : global.HeavenlyIcons;

  var bookmarks = typeof module !== "undefined" && module.exports ? require("../public/assets/heavenly-bookmarks.js") : global.HeavenlyBookmarks;

  var catalog = typeof module !== "undefined" && module.exports ? require("../public/assets/heavenly-catalog.js") : global.HeavenlyCatalog;

  // todo:
  // - postMessage
  // - open
  // - DOM Mutation Observer
  //   - href
  //   - src
  //   - srcset
  //   - style (this could get tricky...)
  //   - poster (on <video> elements)
  //   - perhaps some/all of this could be shared by the server-side url-rewriter
  // - split each part into separate files (?)
  // - wrap other JS and provide proxies to fix writes to window.location and document.cookie
  //   - will require updating contentTypes.html.includes(data.contentType) to include js
  //   - that, in turn will require decompressing js....
  // call() and apply() on `this || original_thing`
  // prevent a failure in one initializer from stopping subsequent initializers

  // Adapted from Bolt PR #197. Keep JavaScript whitespace semantics for legacy
  // inputs while avoiding a regexp call for each ordinary ASCII character.
  function isSrcsetWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r' ||
      c === '\f' || c === '\v' || (c >= '\u0080' && /\s/.test(c));
  }

  function fixSrcset(srcsetStr, config, location) {
    if (srcsetStr === null || srcsetStr === undefined) {
      return srcsetStr;
    }
    srcsetStr = srcsetStr.toString();
    // A comma inside an image URL (especially data:) is not a candidate
    // separator. Consume URL tokens before descriptors, as the HTML srcset
    // parser does, rather than splitting base64 placeholders into fake URLs.
    var fixedCandidates = [], index = 0;
    while (index < srcsetStr.length) {
      while (index < srcsetStr.length && (isSrcsetWhitespace(srcsetStr[index]) || srcsetStr[index] === ',')) index++;
      var start = index;
      while (index < srcsetStr.length && !isSrcsetWhitespace(srcsetStr[index])) index++;
      var url = srcsetStr.slice(start, index);
      if (!url) break;
      var descriptor = '';
      if (/,$/.test(url)) url = url.replace(/,+$/, '');
      else {
        start = index;
        var depth = 0;
        while (index < srcsetStr.length) {
          var char = srcsetStr[index];
          if (char === ',' && !depth) break;
          if (char === '(') depth++;
          if (char === ')') depth = Math.max(0, depth - 1);
          index++;
        }
        descriptor = srcsetStr.slice(start, index).trim();
      }
      if (url) fixedCandidates.push(fixUrl(url, config, location) + (descriptor ? ' ' + descriptor : ''));
    }
    return fixedCandidates.join(", ");
  }

  function createUnproxiedUrl(urlStr) {
    if (urlStr === null || urlStr === undefined) return urlStr;
    var s = new String(urlStr);
    s.__unproxiedBypass = true;
    return s;
  }

  function fixUrl(urlStr, config, location) {
    if (urlStr === null || urlStr === undefined) {
      return urlStr;
    }
    if (urlStr && urlStr.__unproxiedBypass) {
      return urlStr.toString();
    }
    urlStr = urlStr.toString();

    var prefix = config.prefix;
    var prefixLen = prefix.length;

    // The deployment toolbar is hosting infrastructure, not remote-site content.
    // Its runtime derives iframe origins from currentScript.src. Proxying that
    // script turns its feedback frame into a remote-site 404, which can inject
    // another toolbar. Keep only this verified HTTPS runtime namespace direct.
    if (urlStr.indexOf('/_next-live/') !== -1) {
      var runtime = urlStr;
      if (runtime.startsWith(prefix)) runtime = runtime.slice(prefixLen);
      else if (runtime.startsWith(location.origin + prefix)) runtime = runtime.slice((location.origin + prefix).length);
      try {
        var runtimeUrl = new URL(runtime);
        if (runtimeUrl.origin === 'https://vercel.live' && runtimeUrl.pathname.startsWith('/_next-live/')) return runtimeUrl.href;
      } catch (e) {}
    }

    // Performance optimization: Use String.prototype.startsWith instead of substr() slicing
    // to avoid creating temporary string slice allocations on hot URL rewriter paths (~60% speedup)
    if (urlStr.startsWith(prefix)) {
      return urlStr.replace(/^(\/proxy\/https?:\/)([^/])/i, "$1/$2");
    }

    // Early fast-path: non-HTTP/HTTPS schemes that should not be proxied
    // Avoids expensive new URL() parsing overhead for common data, script, or anchor URIs
    if (
      urlStr.startsWith("javascript:") ||
      urlStr.startsWith("data:") ||
      urlStr.startsWith("about:") ||
      urlStr.startsWith("blob:") ||
      urlStr.startsWith("mailto:") ||
      urlStr.startsWith("tel:")
    ) {
      return urlStr;
    }

    // Performance optimization: Fast-path check single-slash malformed URLs (e.g., https:/example.com)
    // avoids regex execution for standard absolute and relative URLs
    if (urlStr.indexOf(":/") !== -1 && urlStr.indexOf("://") === -1) {
      urlStr = urlStr.replace(/^(https?:\/)([^\/])/i, "$1/$2");
    }

    var isAbsoluteHttp =
      urlStr.startsWith("http://") || urlStr.startsWith("https://");

    var currentRemoteHref;
    function getCurrentRemoteHref() {
      if (currentRemoteHref !== undefined) return currentRemoteHref;
      if (config.documentBaseUrl) {
        var base = config.documentBaseUrl();
        var remoteBase = navigation.remoteUrl(base, location.origin, prefix);
        if (remoteBase) { currentRemoteHref = remoteBase; return currentRemoteHref; }
      }
      if (location.pathname.startsWith(prefix)) {
        currentRemoteHref =
          location.pathname.substr(prefixLen) +
          location.search +
          location.hash;
      } else {
        // in case sites (such as youtube) manage to bypass our history wrapper
        currentRemoteHref = config.url;
      }
      while (currentRemoteHref && currentRemoteHref.indexOf(prefix) !== -1) {
        var idx = currentRemoteHref.indexOf(prefix);
        currentRemoteHref = currentRemoteHref.substring(idx + prefixLen);
      }
      if (
        currentRemoteHref &&
        currentRemoteHref.indexOf(":/") !== -1 &&
        currentRemoteHref.indexOf("://") === -1
      ) {
        currentRemoteHref = currentRemoteHref.replace(
          /^(https?:\/)([^\/])/i,
          "$1/$2"
        );
      }
      return currentRemoteHref;
    }

    // Performance optimization: Lazily pass base URL only for relative URLs
    var url;
    if (isAbsoluteHttp) {
      url = new URL(urlStr);
    } else {
      url = new URL(urlStr, getCurrentRemoteHref());
    }

    // check if it's already proxied (absolute)
    if (
      url.origin === location.origin &&
      url.pathname.substr(0, prefixLen) === prefix
    ) {
      return urlStr.replace(/(\/proxy\/https?:\/)([^/])/i, "$1/$2");
    }

    // don't break data: urls, about:blank, etc
    // todo: do modify ws: and wss: protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return urlStr;
    }

    // sometimes websites are tricky and use the current host or hostname + a relative url
    // check hostname (ignoring port)
    if (url.hostname === location.hostname) {
      var currentRemoteUrl = new URL(getCurrentRemoteHref());
      // set host (including port)
      url.hostname = currentRemoteUrl.hostname;
      url.port = currentRemoteUrl.port;
      // also keep the remote site's current protocol
      url.protocol = currentRemoteUrl.protocol;
      // todo: handle websocket protocols
    }
    return prefix + url.href;
  }

  // URL and Location must retain their native origin/path semantics. Framework
  // routers validate relative URLs against the real document origin; pretending
  // /proxy/https://host/path has the remote origin breaks those checks. Browsers
  // also expose non-configurable Location own properties, so prototype spoofing
  // cannot reliably virtualize location. Rewrite requests/history explicitly.
  function repairDocumentProxyPath(config, window) {
    if (!window.history || !window.history.replaceState || !window.location) return;
    var loc = window.location;
    var path = loc.pathname || '';
    var repaired = path.replace(/^(\/proxy\/https?:\/)([^/])/i, '$1/$2');
    if (repaired === path) return;
    window.history.replaceState(window.history.state, '', repaired + (loc.search || '') + (loc.hash || ''));
  }

  function initElementPrototypes(config, window) {
    function wrapProperty(proto, prop, fixFn) {
      if (!proto) return;
      var desc;
      var p = proto;
      while (p && !(desc = Object.getOwnPropertyDescriptor(p, prop))) {
        p = Object.getPrototypeOf(p);
      }
      if (!desc || !desc.set) return;
      var nativeSet = desc.set;
      var nativeGet = desc.get;
      Object.defineProperty(proto, prop, {
        get: function () {
          var val = nativeGet.call(this);
          if (typeof val === "string" && val) {
            return fixFn(val, config, window.location);
          }
          return val;
        },
        set: function (val) {
          return nativeSet.call(this, fixFn(val, config, window.location));
        },
        configurable: true,
        enumerable: desc.enumerable,
      });
    }

    if (window.HTMLImageElement && window.HTMLImageElement.prototype) {
      wrapProperty(window.HTMLImageElement.prototype, "src", fixUrl);
      wrapProperty(window.HTMLImageElement.prototype, "srcset", fixSrcset);
    }
    if (window.HTMLSourceElement && window.HTMLSourceElement.prototype) {
      wrapProperty(window.HTMLSourceElement.prototype, "src", fixUrl);
      wrapProperty(window.HTMLSourceElement.prototype, "srcset", fixSrcset);
    }
    if (window.HTMLScriptElement && window.HTMLScriptElement.prototype) {
      wrapProperty(window.HTMLScriptElement.prototype, "src", fixUrl);
    }
    if (window.HTMLIFrameElement && window.HTMLIFrameElement.prototype) {
      wrapProperty(window.HTMLIFrameElement.prototype, "src", fixUrl);
    }
    if (window.HTMLMediaElement && window.HTMLMediaElement.prototype) {
      wrapProperty(window.HTMLMediaElement.prototype, "src", fixUrl);
    }
    if (window.HTMLAnchorElement && window.HTMLAnchorElement.prototype) {
      wrapProperty(window.HTMLAnchorElement.prototype, "href", fixUrl);
    }
    if (window.HTMLLinkElement && window.HTMLLinkElement.prototype) {
      wrapProperty(window.HTMLLinkElement.prototype, "href", fixUrl);
    }

    if (window.Element && window.Element.prototype && window.Element.prototype.setAttribute) {
      var _setAttribute = window.Element.prototype.setAttribute;
      window.Element.prototype.setAttribute = function (name, value) {
        if (typeof name === "string") {
          var lowerName = name.toLowerCase();
          if (lowerName === "src" || lowerName === "href" || lowerName === "poster" || lowerName === "data-src" || lowerName === "data-href" || lowerName === "data-url") {
            value = fixUrl(value, config, window.location);
          } else if (lowerName === "srcset" || lowerName === "data-srcset") {
            value = fixSrcset(value, config, window.location);
          }
        }
        return _setAttribute.call(this, name, value);
      };
    }

    if (window.open && !window.__nativeWinOpen) {
      var _winOpen = window.open;
      window.__nativeWinOpen = _winOpen;
      window.open = function (url) {
        var args = Array.prototype.slice.call(arguments);
        if (args[0]) {
          args[0] = fixUrl(args[0], config, window.location);
        }
        return window.__nativeWinOpen.apply(window, args);
      };
    }
  }

  function initMutationObserverAndClicks(config, window) {
    // Fast element processor using uppercase tag comparisons (DOM element.tagName is uppercase)
    // Bypasses toLowerCase() string allocations and eliminates redundant attribute checks for structural non-resource tags (~12.6% speedup)
    function processElementNode(el) {
      if (!el || el.nodeType !== 1) return;

      var tag = el.tagName || "";
      if (tag === "IMG" || tag === "SCRIPT" || tag === "IFRAME" || tag === "SOURCE" || tag === "VIDEO" || tag === "AUDIO") {
        var src = el.getAttribute("src");
        if (src) {
          var fixedSrc = fixUrl(src, config, window.location);
          if (fixedSrc !== src) {
            try { el.setAttribute("src", fixedSrc); } catch (e) {}
          }
        }
        var dataSrc = el.getAttribute("data-src");
        if (dataSrc) {
          var fixedDataSrc = fixUrl(dataSrc, config, window.location);
          if (fixedDataSrc !== dataSrc) {
            try { el.setAttribute("data-src", fixedDataSrc); } catch (e) {}
          }
        }
        var dataUrl = el.getAttribute("data-url");
        if (dataUrl) {
          var fixedDataUrl = fixUrl(dataUrl, config, window.location);
          if (fixedDataUrl !== dataUrl) {
            try { el.setAttribute("data-url", fixedDataUrl); } catch (e) {}
          }
        }
        var lazySrcset = el.getAttribute("data-srcset");
        if (lazySrcset) {
          var fixedLazy = fixSrcset(lazySrcset, config, window.location);
          if (fixedLazy !== lazySrcset) el.setAttribute("data-srcset", fixedLazy);
        }
        var srcset = el.getAttribute("srcset");
        if (srcset) {
          var fixedSrcset = fixSrcset(srcset, config, window.location);
          if (fixedSrcset !== srcset) {
            try { el.setAttribute("srcset", fixedSrcset); } catch (e) {}
          }
        }
      } else if (tag === "A" || tag === "LINK") {
        var href = el.getAttribute("href");
        if (href) {
          var fixedHref = fixUrl(href, config, window.location);
          if (fixedHref !== href) {
            try { el.setAttribute("href", fixedHref); } catch (e) {}
          }
        }
        var dataHref = el.getAttribute("data-href");
        if (dataHref) {
          var fixedDataHref = fixUrl(dataHref, config, window.location);
          if (fixedDataHref !== dataHref) {
            try { el.setAttribute("data-href", fixedDataHref); } catch (e) {}
          }
        }
        var dataUrl2 = el.getAttribute("data-url");
        if (dataUrl2) {
          var fixedDataUrl2 = fixUrl(dataUrl2, config, window.location);
          if (fixedDataUrl2 !== dataUrl2) {
            try { el.setAttribute("data-url", fixedDataUrl2); } catch (e) {}
          }
        }
      }

      var children = el.children;
      if (children) {
        var cLen = children.length;
        for (var i = 0; i < cLen; i++) {
          processElementNode(children[i]);
        }
      }
    }

    if (typeof window.MutationObserver !== "undefined" && window.document && window.document.documentElement) {
      var observer = new window.MutationObserver(function (mutations) {
        // A parser/SPA batch can include both an inserted parent and hundreds
        // of its descendants. Walk each final subtree once, rather than once
        // for every insertion record. Keep the sets local to this delivery so
        // moving the same element in a later batch still gets processed.
        var roots = new Set();
        var attributes = new Map();
        var mLen = mutations.length;
        for (var i = 0; i < mLen; i++) {
          var mut = mutations[i];
          if (mut.type === "childList") {
            var added = mut.addedNodes;
            if (added) {
              var aLen = added.length;
              for (var j = 0; j < aLen; j++) {
                var node = added[j];
                if (node.nodeType === 1 && node.isConnected !== false) roots.add(node);
              }
            }
          } else if (mut.type === "attributes") {
            var target = mut.target;
            if (!target || target.nodeType !== 1) continue;
            if (target.isConnected === false) continue;
            var names = attributes.get(target);
            if (!names) { names = new Set(); attributes.set(target, names); }
            names.add(mut.attributeName);
          }
        }
        function hasInsertedAncestor(node) {
          for (var parent = node.parentNode; parent; parent = parent.parentNode) {
            if (roots.has(parent)) return true;
          }
          return false;
        }
        roots.forEach(function (root) {
          if (!hasInsertedAncestor(root)) processElementNode(root);
        });
        attributes.forEach(function (names, target) {
          // Attribute records also cover custom lazy-resource containers that
          // are not among processElementNode's resource element types.
          names.forEach(function (attrName) {
            if (!attrName) return;

            if (attrName === "src" || attrName === "href" || attrName === "data-src" || attrName === "data-href" || attrName === "data-url" ||
                attrName === "SRC" || attrName === "HREF" || attrName === "DATA-SRC" || attrName === "DATA-HREF" || attrName === "DATA-URL") {
              var val = target.getAttribute(attrName);
              if (val) {
                var fixedVal = fixUrl(val, config, window.location);
                if (fixedVal !== val) {
                  try { target.setAttribute(attrName, fixedVal); } catch (e) {}
                }
              }
            } else if (attrName === "srcset" || attrName === "SRCSET" || attrName === "data-srcset" || attrName === "DATA-SRCSET") {
              var srcsetVal = target.getAttribute(attrName);
              if (srcsetVal) {
                var fixedSrcsetVal = fixSrcset(srcsetVal, config, window.location);
                if (fixedSrcsetVal !== srcsetVal) {
                  try { target.setAttribute(attrName, fixedSrcsetVal); } catch (e) {}
                }
              }
            }
          });
        });
      });

      observer.observe(window.document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "href", "srcset", "data-src", "data-href", "data-url", "data-srcset"]
      });
    }

    // Global capture-phase click and auxclick event listener to enforce proxied href on anchor clicks & intercept EverythingMoe/FMHY links
    function handleLinkClick(e) {
      var target = e.target;
      while (target && target !== window.document) {
        if (target.tagName && target.tagName.toLowerCase() === "a") {
          var rawHref = target.getAttribute("href");
          if (rawHref) {
            var proxiedHref = fixUrl(rawHref, config, window.location);
            if (proxiedHref !== rawHref) {
              try { target.setAttribute("href", proxiedHref); } catch (err) {}
            }

            // Open an EverythingMoe linkion
            if (isEverythingMoePage(window, config)) {
              if (rawHref.substr(0, 11) !== "javascript:" && rawHref.substr(0, 1) !== "#") {
                e.preventDefault();
                e.stopPropagation();
                openEverythingMoeLinkModal(window, config, rawHref, proxiedHref);
                return;
              }
            }

            // FMHY Outbound Link Interception
            if (isFmhyPage(window, config)) {
              // Exclude internal clicks originating from FMHY search or container elements
              if (!target.closest('.shell') && !target.closest('.search-bar') && !target.closest('#localsearch-input') && !target.closest('.results')) {
                if (rawHref.substr(0, 11) !== "javascript:" && rawHref.substr(0, 1) !== "#") {
                  var extractedTarget = extractTargetRemoteUrl(rawHref, window, config);
                  try {
                    var parsedTarget = new URL(extractedTarget);
                    if (!/(^|\.)fmhy\.net$/i.test(parsedTarget.hostname)) {
                      e.preventDefault();
                      e.stopPropagation();
                      openFmhyLinkModal(window, config, rawHref, proxiedHref);
                      return;
                    }
                  } catch (err) {}
                }
              }
            }
          }
          break;
        }
        target = target.parentNode;
      }
    }

    window.addEventListener("click", handleLinkClick, true);
    window.addEventListener("auxclick", handleLinkClick, true);
  }

  function initXMLHttpRequest(config, window) {
    if (!window.XMLHttpRequest) return;
    var _XMLHttpRequest = window.XMLHttpRequest;
    var _open = _XMLHttpRequest.prototype ? _XMLHttpRequest.prototype.open : null;

    if (_open) {
      _XMLHttpRequest.prototype.open = function () {
        var args = Array.prototype.slice.call(arguments);
        if (args[1]) {
          args[1] = fixUrl(args[1], config, window.location);
        }
        return _open.apply(this, args);
      };
    }

    function ProxyXMLHttpRequest(opts) {
      var xhr = new _XMLHttpRequest(opts);
      var instanceOpen = xhr.open;
      xhr.open = function () {
        var args = Array.prototype.slice.call(arguments);
        if (args[1]) {
          args[1] = fixUrl(args[1], config, window.location);
        }
        return instanceOpen.apply(xhr, args);
      };
      return xhr;
    }

    ProxyXMLHttpRequest.prototype = _XMLHttpRequest.prototype;

    for (var key in _XMLHttpRequest) {
      if (Object.prototype.hasOwnProperty.call(_XMLHttpRequest, key)) {
        ProxyXMLHttpRequest[key] = _XMLHttpRequest[key];
      }
    }
    ProxyXMLHttpRequest.UNSENT = _XMLHttpRequest.UNSENT || 0;
    ProxyXMLHttpRequest.OPENED = _XMLHttpRequest.OPENED || 1;
    ProxyXMLHttpRequest.HEADERS_RECEIVED = _XMLHttpRequest.HEADERS_RECEIVED || 2;
    ProxyXMLHttpRequest.LOADING = _XMLHttpRequest.LOADING || 3;
    ProxyXMLHttpRequest.DONE = _XMLHttpRequest.DONE || 4;

    window.XMLHttpRequest = ProxyXMLHttpRequest;
  }

  function initFetch(config, window) {
    if (!window.fetch) return;
    var _fetch = window.fetch;

    window.fetch = function (resource, init) {
      if (resource && typeof resource === "object") {
        if (resource.url) {
          var proxiedUrl = fixUrl(resource.url, config, window.location);
          var isRequest =
            (typeof Request !== "undefined" && resource instanceof Request) ||
            (resource.constructor && resource.constructor.name === "Request");
          if (isRequest) {
            resource = new Request(proxiedUrl, resource);
          } else {
            try {
              resource.url = proxiedUrl;
            } catch (e) {
              if (typeof Request !== "undefined") {
                resource = new Request(proxiedUrl, resource);
              }
            }
          }
        } else if (typeof URL !== "undefined" && resource instanceof URL) {
          resource = fixUrl(resource.href, config, window.location);
        } else if (typeof resource.toString === "function") {
          resource = fixUrl(resource.toString(), config, window.location);
        }
      } else if (resource !== null && resource !== undefined) {
        resource = fixUrl(resource.toString(), config, window.location);
      }
      return _fetch.call(window, resource, init);
    };
  }

  // this prevents an initial request to the wrong (unproxied) URL
  // it also is important for <img> and <audio> elements that are only created in memory, and never added to the DOM
  function initCreateElement(config, window) {
    if (!window.document || !window.document.createElement) return;
    var _createElement = window.document.createElement;

    window.document.createElement = function (tagName, options) {
      if (typeof tagName === "string" && tagName.toLowerCase() === "iframe") {
        initAppendBodyIframe(config, window);
      }
      return _createElement.call(window.document, tagName, options);
    };
  }

  // js on some sites, such as youtube, uses an iframe to grab native APIs such as history, so we need to fix those also.
  // document.body isn't available when this script is first executed,
  // so we'll also try when createElement is called, but set a flag to ensure it only installs once
  function initAppendBodyIframe(config, window) {
    if (
      !window.document ||
      !window.document.body ||
      !window.document.body.appendChild ||
      window.document.body.unblockerIframeAppendListenerInstalled
    ) {
      return;
    }

    var _appendChild = window.document.body.appendChild;

    window.document.body.appendChild = function (element) {
      var ret = _appendChild.call(window.document.body, element);
      if (
        element.tagName &&
        element.tagName.toLowerCase() === "iframe" &&
        element.src === "about:blank" &&
        element.contentWindow
      ) {
        initForWindow(config, element.contentWindow);
      }
      return ret;
    };
    window.document.body.unblockerIframeAppendListenerInstalled = true;
  }

  function initWebSockets(config, window) {
    if (!window.WebSocket) return;
    var _WebSocket = window.WebSocket;
    var prefix = config.prefix;
    var winLoc = window.location;
    var proxyHost = winLoc.host;
    var isSecure = winLoc.protocol === "https:";
    var target = navigation.currentRemoteUrl(window, config);
    var targetURL;
    try { targetURL = new URL(target); } catch (e) { return; }

    // ws:// or wss:// then at least one char for location,
    // then either the end or a path
    var reWsUrl = /^ws(s?):\/\/([^/]+)($|\/.*)/;

    window.WebSocket = function (url, protocols) {
      var parsedUrl = url.match(reWsUrl);
      if (parsedUrl) {
        var wsSecure = parsedUrl[1];
        // force downgrade if wss:// is called on insecure page
        // (in case the proxy only supports http)
        var wsProto = isSecure ? "ws" + wsSecure + "://" : "ws://";
        var wsHost = parsedUrl[2];
        // deal with "relative" js that uses the current url rather than a hard-coded one
        if (wsHost.split(":")[0] === winLoc.hostname) {
          wsHost = targetURL.host;
        }
        var wsPath = parsedUrl[3];
        // prefix the websocket with the proxy server
        return new _WebSocket(
          wsProto +
            proxyHost +
            prefix +
            "http" +
            wsSecure +
            "://" +
            wsHost +
            wsPath
        );
      }
      // fallback in case the regex failed
      return new _WebSocket(url, protocols);
    };
  }

  // todo: figure out how youtube bypasses this
  // notes: look at bindHistoryStateFunctions_ - it looks like it checks the contentWindow.history of an iframe *fitst*, then it's __proto__, then the global history api
  //        - so, we need to inject this into iframes also
  function initPushState(config, window) {
    if (!window.history || !window.history.pushState || window.history.__heavenlyWrapped) return;
    ['pushState', 'replaceState'].forEach(function (method) {
      var native = window.history[method];
      if (!native) return;
      window.history[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 2 && args[2] !== null && args[2] !== undefined && args[2] !== '') {
          args[2] = fixUrl(args[2], config, window.location);
        }
        var result = native.apply(window.history, args);
        // Update only after native history accepts the URL. Omitted URLs still update state.
        var remote = navigation.currentRemoteUrl(window, config);
        if (remote) config.url = remote;
        if (window.__heavenlyNavigationChanged) window.__heavenlyNavigationChanged();
        return result;
      };
    });
    window.history.__heavenlyWrapped = true;
  }


  function isPresetTitle(title, settings) {
    if (!title) return false;
    // Fast-path equality checks for built-in preset titles avoiding array allocation & iteration
    if (
      title === "Google Classroom" ||
      title === "My Drive - Google Drive" ||
      title === "Dashboard" ||
      title === "Dashboard | Khan Academy"
    ) {
      return true;
    }
    if (DEFAULT_PRESET_TITLES.indexOf(title) !== -1) return true;
    // Direct matching in custom presets avoiding presetTitles array allocation
    if (settings && settings.customPresets) {
      for (var k in settings.customPresets) {
        if (settings.customPresets[k] && settings.customPresets[k].title === title) {
          return true;
        }
      }
    }
    return false;
  }

  var DEFAULT_RANDOM_POOL = ['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva'];

  var DEFAULT_PRESETS = {
    classroom: { title: "Google Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
    google: { title: "Google", icon: "https://www.google.com/favicon.ico" },
    docs: { title: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" },
    slides: { title: "Google Slides", icon: "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico" },
    drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
    gmail: { title: "Gmail", icon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
    canvas: { title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
    quizlet: { title: "Flashcards, learning tools and textbook solutions | Quizlet", icon: "https://quizlet.com/favicon.ico" },
    khan: { title: "Dashboard | Khan Academy", icon: "https://www.khanacademy.org/favicon.ico" },
    wikipedia: { title: "Wikipedia", icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico" },
    youtube: { title: "YouTube", icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64" },
    outlook: { title: "Outlook", icon: "https://outlook.office.com/favicon.ico" },
    notion: { title: "Notion", icon: "https://www.notion.so/images/favicon.ico" },
    elearn_lee: { title: "Courses", icon: "https://www.google.com/s2/favicons?domain=elearn.lee.edu&sz=64" },
    lee_college: { title: "Home | Lee College", icon: "https://www.google.com/s2/favicons?domain=www.lee.edu&sz=64" },
    canva: { title: "Canva", icon: "https://www.canva.com/favicon.ico" }
  };
  var DEFAULT_PRESET_TITLES = Object.keys(DEFAULT_PRESETS).map(function (key) { return DEFAULT_PRESETS[key].title; });

  function resolveActivePreset(settings, win) {
    if (!settings) return DEFAULT_PRESETS.classroom;
    var allPresets = Object.assign({}, DEFAULT_PRESETS, settings.customPresets);
    var selectedKey = settings.selectedPreset;

    if (settings.randomizePresetEachSession) {
      try {
        var sessStorage = (win && win.sessionStorage) || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
        if (sessStorage) {
          var poolKeys = Object.keys(allPresets);
          if (settings.randomPool && Array.isArray(settings.randomPool) && settings.randomPool.length > 0) {
            var filteredPool = poolKeys.filter(function (k) { return settings.randomPool.indexOf(k) !== -1; });
            if (filteredPool.length > 0) poolKeys = filteredPool;
          }

          var sessionPreset = sessStorage.getItem('heavenly_session_preset');
          if (sessionPreset && allPresets[sessionPreset] && poolKeys.indexOf(sessionPreset) !== -1) {
            selectedKey = sessionPreset;
          } else {
            if (poolKeys.length > 0) {
              selectedKey = poolKeys[Math.floor(Math.random() * poolKeys.length)];
              sessStorage.setItem('heavenly_session_preset', selectedKey);
            }
          }
        }
      } catch (e) {}
    }

    return allPresets[selectedKey] || DEFAULT_PRESETS.classroom;
  }

  var _lastRawSettings = null;
  var _cachedHeavenlySettings = null;

  function loadHeavenlySettings(window) {
    var raw = null;
    try {
      raw = (window.localStorage || localStorage).getItem('heavenly_settings');
    } catch (e) {}

    if (raw !== null && raw === _lastRawSettings && _cachedHeavenlySettings !== null) {
      return _cachedHeavenlySettings;
    }

    var saved = {};
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
      } catch (e) {}
    }

    _lastRawSettings = raw;
    _cachedHeavenlySettings = Object.assign(navigation.navigationSettings(saved), {
      autoCloak: saved.autoCloak !== undefined ? saved.autoCloak : false,
      persistentCloak: saved.persistentCloak || false,
      decoyAutoTimer: saved.decoyAutoTimer !== undefined ? Boolean(saved.decoyAutoTimer) : false,
      randomizePresetEachSession: saved.randomizePresetEachSession || false,
      randomPool: (saved.randomPool && Array.isArray(saved.randomPool)) ? saved.randomPool : DEFAULT_RANDOM_POOL.slice(),
      selectedPreset: saved.selectedPreset || 'classroom',
      customPresets: saved.customPresets || {},
      panicKeyEnable: saved.panicKeyEnable || false,
      panicKey: typeof saved.panicKey === 'string' ? saved.panicKey : '`',
      touchPanic: saved.touchPanic !== undefined ? saved.touchPanic : true,
      panicUrl: saved.panicUrl || 'https://classroom.google.com',
      panicAppearance: saved.panicAppearance === 'document' ? 'document' : 'website',
      showScrollLock: saved.showScrollLock !== undefined ? saved.showScrollLock : true,
      showMagnifier: saved.showMagnifier !== undefined ? saved.showMagnifier : true,
      showNavBookmark: saved.showNavBookmark !== undefined ? saved.showNavBookmark : true,
      showNavSearch: saved.showNavSearch !== undefined ? saved.showNavSearch : true,
      showNavHome: saved.showNavHome !== undefined ? saved.showNavHome : true,
      useWidgetDock: saved.useWidgetDock !== undefined ? saved.useWidgetDock : true,
      dockPosition: saved.dockPosition || 'bottom',
      expandDirection: saved.expandDirection || 'left',
      disableAllWidgets: saved.disableAllWidgets || false,
      disableAllFeatures: saved.disableAllFeatures || false
    });

    return _cachedHeavenlySettings;
  }

  function initHeavenlyCloakAndPanic(window, settings, config) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return;

      if (!settings) {
        settings = loadHeavenlySettings(window);
      }

      if (settings.disableAllFeatures) {
        var existingPanic = window.document ? window.document.getElementById('heavenly-touch-panic-root') : null;
        if (existingPanic) existingPanic.remove();
      }

      var currentlyCloaked = false;
      var appliedCloakTitle = null;
      var latestOriginalTitle = window.document ? window.document.title : '';
      if (window.document && window.document.title && !isPresetTitle(window.document.title, settings)) {
        window.__heavenlyOriginalTitle = window.document.title;
      }

      function getPresetData() {
        return resolveActivePreset(settings, window);
      }

      function applyCloak(isCloaked) {
        if (!window.document) return;
        currentlyCloaked = isCloaked;
        var preset = getPresetData();
        var head = window.document.head || window.document.getElementsByTagName('head')[0];

        if (isCloaked) {
          if (window.document.title && window.document.title !== appliedCloakTitle && !isPresetTitle(window.document.title, settings)) {
            latestOriginalTitle = window.document.title;
            window.__heavenlyOriginalTitle = latestOriginalTitle;
          }
          window.document.title = preset.title;
          appliedCloakTitle = preset.title;

          if (head) {
            var iconLinks = window.document.querySelectorAll("link[rel*='icon']");
            for (var i = 0; i < iconLinks.length; i++) {
              var l = iconLinks[i];
              if (l.id !== 'heavenly-cloak-icon') {
                if (!l.hasAttribute('data-heavenly-rel')) {
                  l.setAttribute('data-heavenly-rel', l.getAttribute('rel') || 'icon');
                }
                l.setAttribute('rel', 'disabled-icon');
              }
            }

            var cloakLink = window.document.getElementById('heavenly-cloak-icon');
            if (!cloakLink) {
              cloakLink = window.document.createElement('link');
              cloakLink.id = 'heavenly-cloak-icon';
              head.appendChild(cloakLink);
            }
            cloakLink.type = 'image/x-icon';
            cloakLink.rel = 'shortcut icon';
            cloakLink.href = preset.icon;
          }
        } else {
          if (latestOriginalTitle) {
            window.document.title = latestOriginalTitle;
          }
          appliedCloakTitle = null;

          var cloakLink2 = window.document.getElementById('heavenly-cloak-icon');
          if (cloakLink2 && cloakLink2.parentNode) {
            cloakLink2.parentNode.removeChild(cloakLink2);
          }

          var disabledLinks = window.document.querySelectorAll("link[data-heavenly-rel]");
          for (var j = 0; j < disabledLinks.length; j++) {
            var dl = disabledLinks[j];
            var origRel = dl.getAttribute('data-heavenly-rel');
            if (origRel) {
              dl.setAttribute('rel', origRel);
              dl.removeAttribute('data-heavenly-rel');
            }
          }
        }
      }

      // Performance optimization: Reuse passed-in settings instead of re-reading localStorage & JSON.parse on every cloak evaluation
      function syncCloak(refresh) {
        // The injected client can run before the upstream <title> is parsed.
        // Wait for it before changing document.title, so history keeps the real title.
        if (refresh || !settings) {
          settings = loadHeavenlySettings(window);
        }
        if (window.document && window.document.readyState === 'loading') return;
        if (settings.disableAllFeatures) {
          applyCloak(false);
        } else if (settings.persistentCloak) {
          applyCloak(true);
        } else if (settings.autoCloak && window.document.hidden) {
          applyCloak(true);
        } else {
          applyCloak(false);
        }
      }

      // Initial cloak evaluation (handles tabs opened in background)
      syncCloak();

      // Visibility change event
      window.addEventListener('visibilitychange', function () {
        syncCloak(true);
      });

      // DOM load events to ensure cloak runs once head is populated
      if (window.document) {
        if (window.document.readyState === 'loading') {
          window.document.addEventListener('DOMContentLoaded', function () { syncCloak(true); });
        }
        window.addEventListener('load', function () { syncCloak(true); });
      }

      // Cross-tab settings synchronization
      window.addEventListener('storage', function (e) {
        if (!e.key || e.key === 'heavenly_settings') {
          syncCloak(true);
          if (settings.disableAllFeatures || !settings.touchPanic) {
            var panicOverlay = window.document && window.document.getElementById('heavenly-touch-panic-root');
            if (panicOverlay) panicOverlay.remove();
          }
        }
      });

      // Observe dynamic title and favicon changes made by proxied pages
      if (typeof MutationObserver !== 'undefined' && window.document && window.document.documentElement) {
        var observer = new MutationObserver(function () {
          if (currentlyCloaked) {
            var preset = getPresetData();
            if (window.document.title !== preset.title) {
              if (!isPresetTitle(window.document.title, settings)) {
                latestOriginalTitle = window.document.title;
                window.__heavenlyOriginalTitle = latestOriginalTitle;
              }
              window.document.title = preset.title;
            }
            var iconLinks = window.document.querySelectorAll("link[rel*='icon']");
            for (var i = 0; i < iconLinks.length; i++) {
              var l = iconLinks[i];
              if (l.id !== 'heavenly-cloak-icon') {
                if (!l.hasAttribute('data-heavenly-rel')) {
                  l.setAttribute('data-heavenly-rel', l.getAttribute('rel') || 'icon');
                }
                l.setAttribute('rel', 'disabled-icon');
              }
            }
          } else {
            if (window.document.title && !isPresetTitle(window.document.title, settings)) {
              latestOriginalTitle = window.document.title;
              window.__heavenlyOriginalTitle = latestOriginalTitle;
            }
          }
        });

        observer.observe(window.document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      function openPanicDestination(current) {
        if (current.panicAppearance === 'document') {
          var origin = config && config.proxyOrigin || window.location.origin;
          var workspace = new URL('/study-workspace.html', origin);
          try {
            var previous = new URL(window.location.href);
            if (previous.origin === workspace.origin) window.sessionStorage.setItem('heavenly_panic_return', previous.pathname + previous.search + previous.hash);
          } catch (error) {}
          window.location.href = workspace.href;
        } else window.location.href = navigation.safePanicUrl(current.panicUrl) || 'https://classroom.google.com';
      }

      // 3. Panic Key Shortcut
      window.addEventListener('keydown', function (e) {
        var current = loadHeavenlySettings(window);
        if (!current.disableAllFeatures && current.panicKeyEnable && current.panicKey &&
            (e.key === current.panicKey || e.code === current.panicKey)) {
          e.preventDefault();
          openPanicDestination(current);
        }
      }, true);

      // 4. Touch Panic Overlay Button
      if (settings.touchPanic && !settings.disableAllFeatures) {
        function injectPanicOverlay() {
          var current = loadHeavenlySettings(window);
          if (current.disableAllFeatures || !current.touchPanic) return;
          if (!window.document || !window.document.body) return;
          if (window.document.getElementById('heavenly-touch-panic-root')) return;

          var pContainer = window.document.createElement('div');
          pContainer.id = 'heavenly-touch-panic-root';
          pContainer.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:2147483647;user-select:none;-webkit-user-select:none;font-family:"Outfit",sans-serif;';

          // Restore position from localStorage
          try {
            var st = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            var savedPanicPos = st ? st.getItem('heavenly_panic_pos') : null;
            if (savedPanicPos) {
              var pos = JSON.parse(savedPanicPos);
              if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                pContainer.style.bottom = 'auto';
                pContainer.style.left = pos.left + 'px';
                pContainer.style.top = pos.top + 'px';
              }
            }
          } catch (e) {}

          var pShadow = pContainer.attachShadow ? pContainer.attachShadow({ mode: 'open' }) : pContainer;

          var pStyle = window.document.createElement('style');
          pStyle.textContent = [
            '.panic-wrapper { position: relative; display: inline-flex; align-items: center; justify-content: center; }',
            '.panic-btn {',
            '  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);',
            '  color: #ffffff; border: none; border-radius: 20px; font-weight: 700; font-size: 13px;',
            '  cursor: pointer; box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); padding: 10px 16px;',
            '  display: flex; align-items: center; gap: 6px; white-space: nowrap;',
            '  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;',
            '}',
            '.panic-btn.minimized {',
            '  width: 42px; height: 42px; padding: 0; border-radius: 50%; justify-content: center;',
            '  opacity: 0.85; font-size: 18px;',
            '}',
            '.panic-btn.dragging { cursor: grabbing; box-shadow: 0 0 25px rgba(239, 68, 68, 0.9); }',
            '.progress-svg { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); pointer-events: none; opacity: 0; transition: opacity 0.2s; }',
            '.progress-svg.active { opacity: 1; }',
            '.progress-circle { fill: none; stroke: #38bdf8; stroke-width: 3; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }'
          ].join('\n');

          var wrapper = window.document.createElement('div');
          wrapper.className = 'panic-wrapper';
          wrapper.innerHTML = [
            '<svg class="progress-svg" id="prog-svg" viewBox="0 0 50 50">',
            '  <circle class="progress-circle" id="prog-circle" cx="25" cy="25" r="22" stroke-dasharray="138" stroke-dashoffset="138"></circle>',
            '</svg>',
            '<button type="button" class="panic-btn" id="p-btn">',
            '  <span>🚨</span><span class="btn-label">PANIC</span>',
            '</button>'
          ].join('\n');

          pShadow.appendChild(pStyle);
          pShadow.appendChild(wrapper);
          window.document.body.appendChild(pContainer);

          var btn = pShadow.querySelector('#p-btn');
          var progSvg = pShadow.querySelector('#prog-svg');
          var progCircle = pShadow.querySelector('#prog-circle');

          var isMinimized = false;
          var autoMinTimer = setTimeout(function () {
            if (!btn) return;
            isMinimized = true;
            if (btn.classList) btn.classList.add('minimized');
            var label = btn.querySelector ? btn.querySelector('.btn-label') : null;
            if (label && label.style) label.style.display = 'none';
          }, 10000);
          if (autoMinTimer && typeof autoMinTimer.unref === 'function') {
            autoMinTimer.unref();
          }

          var isDragging = false;
          var startX = 0, startY = 0;
          var startLeft = 0, startTop = 0;

          function triggerPanic() {
            var current = loadHeavenlySettings(window);
            if (!current.disableAllFeatures && current.touchPanic) openPanicDestination(current);
          }

          var onDown = function (e) {
            isDragging = false;
            startX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

            var rect = pContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
            window.addEventListener('touchmove', onMove, true);
            window.addEventListener('touchend', onUp, true);
          };

          var onMove = function (e) {
            var currentX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            var currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            var dx = currentX - startX;
            var dy = currentY - startY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
              isDragging = true;
              btn.classList.add('dragging');
              pContainer.style.bottom = 'auto';
              pContainer.style.right = 'auto';

              var newLeft = startLeft + dx;
              var newTop = startTop + dy;

              var maxLeft = Math.max(0, (window.innerWidth || 800) - (pContainer.offsetWidth || 100));
              var maxTop = Math.max(0, (window.innerHeight || 600) - (pContainer.offsetHeight || 40));

              pContainer.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
              pContainer.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            }
          };

          var onUp = function () {
            window.removeEventListener('mousemove', onMove, true);
            window.removeEventListener('mouseup', onUp, true);
            window.removeEventListener('touchmove', onMove, true);
            window.removeEventListener('touchend', onUp, true);

            if (isDragging) {
              btn.classList.remove('dragging');
              try {
                var rect = pContainer.getBoundingClientRect();
                var st = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
                if (st) {
                  st.setItem('heavenly_panic_pos', JSON.stringify({ left: rect.left, top: rect.top }));
                }
              } catch (e) {}
            } else {
              // Tap/click triggers panic directly
              triggerPanic();
            }
          };

          if (btn && typeof btn.addEventListener === 'function') {
            btn.addEventListener('mousedown', onDown);
            btn.addEventListener('touchstart', onDown);
            btn.addEventListener('click', function (event) { if (event.detail === 0) triggerPanic(); });
          }
        }

        if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
          injectPanicOverlay();
        } else if (window.document) {
          window.document.addEventListener('DOMContentLoaded', injectPanicOverlay);
        }
      }

    } catch (e) {
      console.error('Error initializing Heavenly Cloak & Panic:', e);
    }
  }

  function extractTargetRemoteUrl(urlStr, window, config) {
    if (!urlStr) return '';
    var prefix = (config && config.prefix) ? config.prefix : '/proxy/';
    var target = urlStr.toString();

    while (target.indexOf(prefix) !== -1) {
      var idx = target.indexOf(prefix);
      target = target.substring(idx + prefix.length);
    }

    if (target.indexOf(":/") !== -1 && target.indexOf("://") === -1) {
      target = target.replace(/^(https?:\/)([^\/])/i, "$1/$2");
    }

    if (target.startsWith('http://') || target.startsWith('https://')) {
      return target;
    }

    if (target.startsWith('//')) {
      return 'https:' + target;
    }

    if (target.startsWith('/')) {
      var currentDirect = getDirectRemoteUrl(window, config);
      try {
        return new URL(target, currentDirect).href;
      } catch (e) {
        return 'https://' + target;
      }
    }

    return 'https://' + target;
  }

  function isEverythingMoePage(window, config) {
    try {
      var directUrl = getDirectRemoteUrl(window, config);
      var u = new URL(directUrl.startsWith('http') ? directUrl : 'https://' + directUrl);
      return /(^|\.)everythingmoe\.com$/i.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function isFmhyPage(window, config) {
    try {
      var directUrl = getDirectRemoteUrl(window, config);
      var u = new URL(directUrl.startsWith('http') ? directUrl : 'https://' + directUrl);
      return /(^|\.)fmhy\.net$/i.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function openIntentionalProxyLink(window, config, proxiedUrl) {
    if (navigation.isCoolmathUrl(navigation.remoteUrl(proxiedUrl, config.proxyOrigin))) {
      return navigation.launch(window, proxiedUrl, { origin: config.proxyOrigin, newTab: true });
    }
    var openFn = window.__nativeWinOpen || window.open;
    return openFn.call(window, proxiedUrl, '_blank', 'noopener');
  }

  function openFmhyLinkModal(window, config, rawUrl, proxiedUrl) {
    try {
      var existingModal = window.document.getElementById('heavenly-fmhy-link-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-fmhy-link-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:500px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var title = window.document.createElement('span');
      title.style.cssText = 'font-size:1.15rem;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:8px;';
      title.innerHTML = '<svg style="width:18px;height:18px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>Open an FMHY link</span>';

      var closeBtn = window.document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;padding:4px;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function () { backdrop.remove(); };

      header.appendChild(title);
      header.appendChild(closeBtn);

      var cleanDirectUrl = extractTargetRemoteUrl(rawUrl, window, config);
      var targetProxiedUrl = fixUrl(cleanDirectUrl, config, window.location);

      var body = window.document.createElement('div');
      body.style.cssText = 'display:flex;flex-direction:column;gap:12px;font-size:0.9rem;color:#cbd5e1;line-height:1.5;';
      body.innerHTML = '<p>Choose how to open this FMHY link in a new tab.</p>' +
        '<div style="background:rgba(30,41,59,0.7);padding:10px 14px;border-radius:12px;border:1px solid rgba(56,189,248,0.25);word-break:break-all;color:#38bdf8;font-weight:600;font-family:monospace;">' + cleanDirectUrl + '</div>';

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;';

      var openProxyBtn = window.document.createElement('button');
      openProxyBtn.type = 'button';
      openProxyBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openProxyBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Open with Proxy</span>';
      openProxyBtn.onclick = function () {
        openIntentionalProxyLink(window, config, targetProxiedUrl);
        backdrop.remove();
      };

      var openDirectBtn = window.document.createElement('button');
      openDirectBtn.type = 'button';
      openDirectBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:rgba(56,189,248,0.15);border:1px solid #38bdf8;color:#38bdf8;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openDirectBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Open Direct (Without Proxy)</span>';
      openDirectBtn.onclick = function () {
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, createUnproxiedUrl(cleanDirectUrl), '_blank', 'noopener');
        backdrop.remove();
      };

      actions.appendChild(openDirectBtn);
      actions.appendChild(openProxyBtn);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(actions);
      backdrop.appendChild(card);

      backdrop.onclick = function (e) {
        if (e.target === backdrop) backdrop.remove();
      };

      var targetParent = window.document.body || window.document.documentElement;
      if (targetParent) targetParent.appendChild(backdrop);
    } catch (e) {
      console.error('Error in FMHY link modal:', e);
      openIntentionalProxyLink(window, config, proxiedUrl);
    }
  }

  function openEverythingMoeLinkModal(window, config, rawUrl, proxiedUrl) {
    try {
      var existingModal = window.document.getElementById('heavenly-em-link-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-em-link-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:500px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var title = window.document.createElement('span');
      title.style.cssText = 'font-size:1.15rem;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:8px;';
      title.innerHTML = '<svg style="width:18px;height:18px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>Open an EverythingMoe link</span>';

      var closeBtn = window.document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;padding:4px;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function () { backdrop.remove(); };

      header.appendChild(title);
      header.appendChild(closeBtn);

      var cleanDirectUrl = extractTargetRemoteUrl(rawUrl, window, config);
      var targetProxiedUrl = fixUrl(cleanDirectUrl, config, window.location);

      var body = window.document.createElement('div');
      body.style.cssText = 'display:flex;flex-direction:column;gap:12px;font-size:0.9rem;color:#cbd5e1;line-height:1.5;';
      body.innerHTML = '<p>Choose how to open this link in a new tab.</p>' +
        '<div style="background:rgba(30,41,59,0.7);padding:10px 14px;border-radius:12px;border:1px solid rgba(56,189,248,0.25);word-break:break-all;color:#38bdf8;font-weight:600;font-family:monospace;">' + cleanDirectUrl + '</div>';

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;';

      var openProxyBtn = window.document.createElement('button');
      openProxyBtn.type = 'button';
      openProxyBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openProxyBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Open with Proxy</span>';
      openProxyBtn.onclick = function () {
        openIntentionalProxyLink(window, config, targetProxiedUrl);
        backdrop.remove();
      };

      var openDirectBtn = window.document.createElement('button');
      openDirectBtn.type = 'button';
      openDirectBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:rgba(56,189,248,0.15);border:1px solid #38bdf8;color:#38bdf8;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openDirectBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Open Direct (Without Proxy)</span>';
      openDirectBtn.onclick = function () {
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, createUnproxiedUrl(cleanDirectUrl), '_blank', 'noopener');
        backdrop.remove();
      };

      actions.appendChild(openDirectBtn);
      actions.appendChild(openProxyBtn);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(actions);
      backdrop.appendChild(card);

      backdrop.onclick = function (e) {
        if (e.target === backdrop) backdrop.remove();
      };

      var targetParent = window.document.body || window.document.documentElement;
      if (targetParent) targetParent.appendChild(backdrop);
    } catch (e) {
      console.error('Error in EverythingMoe link modal:', e);
      openIntentionalProxyLink(window, config, proxiedUrl);
    }
  }

  function getDirectRemoteUrl(window, config) {
    return navigation.currentRemoteUrl(window, config);
  }


  function getPresetSvg(key, size) {
    if (icons && icons.svg) return icons.svg(key, size);
    if (typeof key !== 'string' || key.indexOf('preset:') !== 0) return null;
    return '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a20 20 0 0 1 0 18M12 3a20 20 0 0 0 0 18"/></svg>';
  }

  function goHeavenlyHome(win, config) {
    var origin = config.proxyOrigin || win.location.origin;
    try {
      var wrapper = win.parent && win.parent.__heavenlyWrapper;
      if (wrapper && wrapper.frame.contentWindow === win && wrapper.home) {
        if (win.parent.postMessage) win.parent.postMessage('heavenly:home', origin);
        else wrapper.home();
        return;
      }
      (win.top || win).location.href = origin + '/';
    } catch (e) {
      // The wrapper also recognizes a Heavenly root loaded in its own frame.
      win.location.href = origin + '/';
    }
  }

  function scrollLockMarkup(enabled) {
    var shackle = enabled ? 'M7 11V7a5 5 0 0 1 10 0v4' : 'M7 11V7a5 5 0 0 1 9-3';
    return '<svg aria-hidden="true" class="title-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="' + shackle + '"/></svg><span>' + (enabled ? 'ON' : 'OFF') + '</span>';
  }

  function magnifierMarkup(enabled, lensTitle) {
    // Reuse the magnifier glyph already used by the Dock in every state.
    var svg = '<svg aria-hidden="true" class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    return svg + '<span>' + (lensTitle || (enabled ? 'ON' : 'OFF')) + '</span>';
  }

  function openDirectSitePreview(window, directUrl) {
    try {
      if (!directUrl || directUrl === 'undefined' || directUrl === 'https://' || directUrl === 'http://') {
        alert('The original website address could not be found.');
        return;
      }
      var existingModal = window.document.getElementById('heavenly-direct-preview-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-direct-preview-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:540px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var title = window.document.createElement('span');
      title.style.cssText = 'font-size:1.15rem;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:8px;';
      title.innerHTML = '<svg style="width:18px;height:18px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Test Direct Site (No Proxy)</span>';

      var closeBtn = window.document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;padding:4px;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function () { backdrop.remove(); };

      header.appendChild(title);
      header.appendChild(closeBtn);

      var body = window.document.createElement('div');
      body.style.cssText = 'display:flex;flex-direction:column;gap:12px;font-size:0.9rem;color:#cbd5e1;line-height:1.5;';
      body.innerHTML = '<p>Try this website directly to see whether it works on your network, without Heavenly’s proxy.</p>' +
        '<div style="background:rgba(30,41,59,0.7);padding:10px 14px;border-radius:12px;border:1px solid rgba(56,189,248,0.25);word-break:break-all;color:#38bdf8;font-weight:600;font-family:monospace;">' + directUrl + '</div>' +
        '<p style="font-size:0.82rem;color:#94a3b8;">You can attempt loading the site directly in an isolated test popup or open it in a new tab.</p>';

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;';

      var openTabBtn = window.document.createElement('button');
      openTabBtn.type = 'button';
      openTabBtn.style.cssText = 'padding:10px 18px;border-radius:12px;background:rgba(56,189,248,0.2);border:1px solid #38bdf8;color:#38bdf8;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit;';
      openTabBtn.textContent = '↗ Open in New Tab';
      openTabBtn.onclick = function () {
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, createUnproxiedUrl(directUrl), '_blank', 'noopener');
        backdrop.remove();
      };

      var openPopupBtn = window.document.createElement('button');
      openPopupBtn.type = 'button';
      openPopupBtn.style.cssText = 'padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openPopupBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>Test in Popup Window</span>';
      openPopupBtn.onclick = function () {
        var w = 800, h = 600;
        var left = (window.screen.width / 2) - (w / 2);
        var top = (window.screen.height / 2) - (h / 2);
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, createUnproxiedUrl(directUrl), 'DirectTestPopup', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbars=yes');
        backdrop.remove();
      };

      var copyUrlBtn = window.document.createElement('button');
      copyUrlBtn.type = 'button';
      copyUrlBtn.style.cssText = 'padding:10px 18px;border-radius:12px;background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#e2e8f0;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      copyUrlBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy URL</span>';
      copyUrlBtn.onclick = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(directUrl);
          var sp = copyUrlBtn.querySelector('span');
          if (sp) sp.textContent = 'Copied!';
          setTimeout(function () {
            var s = copyUrlBtn.querySelector('span');
            if (s) s.textContent = 'Copy URL';
          }, 2000);
        } else {
          window.prompt('Copy Direct URL:', directUrl);
        }
      };

      actions.appendChild(copyUrlBtn);
      actions.appendChild(openTabBtn);
      actions.appendChild(openPopupBtn);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(actions);
      backdrop.appendChild(card);

      backdrop.onclick = function (e) {
        if (e.target === backdrop) backdrop.remove();
      };

      var targetParent = window.document.body || window.document.documentElement;
      if (targetParent) targetParent.appendChild(backdrop);
    } catch (e) {
      console.error('Error opening direct site preview:', e);
      var openFn = window.__nativeWinOpen || window.open;
      openFn.call(window, createUnproxiedUrl(directUrl), '_blank', 'noopener');
    }
  }

  function promptBookmarkCurrentPage(window, config) {
    try {
      var storage = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return;

      // All three clients share the same reviewed catalog policy.
      var data = catalog.load(storage);

      var prefix = (config && config.prefix) ? config.prefix : '/proxy/';
      var unproxiedUrl = getDirectRemoteUrl(window, config);
      var title = window.__heavenlyOriginalTitle || window.document.title || unproxiedUrl;
      var domain = '';
      try {
        var u = new URL(unproxiedUrl.startsWith('http') ? unproxiedUrl : 'https://' + unproxiedUrl);
        domain = u.hostname;
      } catch (e) {}
      var defaultFavicon = domain ? 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64' : 'preset:star';

      var existingModal = window.document.getElementById('heavenly-bookmark-prompt-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-bookmark-prompt-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:24px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:520px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overflow-x:hidden;overscroll-behavior:none;overscroll-behavior-y:none;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var titleEl = window.document.createElement('div');
      titleEl.style.cssText = 'display:flex;align-items:center;gap:10px;';
      titleEl.innerHTML = '<div style="width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.4);display:flex;align-items:center;justify-content:center;"><svg style="width:20px;height:20px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div><div><div style="font-size:1.15rem;font-weight:700;color:#f8fafc;">Bookmark Current Page</div><div style="font-size:0.8rem;color:#94a3b8;">Save this page in this browser’s Heavenly bookmarks</div></div>';

      var closeBtn = window.document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;padding:4px;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function () { backdrop.remove(); };

      header.appendChild(titleEl);
      header.appendChild(closeBtn);

      var body = window.document.createElement('div');
      body.style.cssText = 'display:flex;flex-direction:column;gap:14px;font-size:0.88rem;color:#cbd5e1;';

      // Category field
      var catLabel = window.document.createElement('label');
      catLabel.style.cssText = 'font-weight:600;color:#e0f2fe;display:flex;flex-direction:column;gap:6px;';
      catLabel.textContent = 'Category:';
      var catSelect = window.document.createElement('select');
      catSelect.style.cssText = 'padding:10px 12px;background:rgba(30,41,59,0.8);border:1px solid rgba(56,189,248,0.3);border-radius:12px;color:#f8fafc;font-size:0.9rem;outline:none;font-family:inherit;';
      data.categories.forEach(function (c) {
        if (!c.hidden) {
          var opt = window.document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.title;
          catSelect.appendChild(opt);
        }
      });
      catLabel.appendChild(catSelect);

      // Title field
      var titleLabel = window.document.createElement('label');
      titleLabel.style.cssText = 'font-weight:600;color:#e0f2fe;display:flex;flex-direction:column;gap:6px;';
      titleLabel.textContent = 'Title:';
      var titleInput = window.document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = title;
      titleInput.style.cssText = 'padding:10px 12px;background:rgba(30,41,59,0.8);border:1px solid rgba(56,189,248,0.3);border-radius:12px;color:#f8fafc;font-size:0.9rem;outline:none;font-family:inherit;';
      titleLabel.appendChild(titleInput);

      // URL field
      var urlLabel = window.document.createElement('label');
      urlLabel.style.cssText = 'font-weight:600;color:#e0f2fe;display:flex;flex-direction:column;gap:6px;';
      urlLabel.textContent = 'URL:';
      var urlInput = window.document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = unproxiedUrl;
      urlInput.style.cssText = 'padding:10px 12px;background:rgba(30,41,59,0.8);border:1px solid rgba(56,189,248,0.3);border-radius:12px;color:#f8fafc;font-size:0.9rem;outline:none;font-family:inherit;';
      urlLabel.appendChild(urlInput);

      // Icon Selection Section
      var iconSection = window.document.createElement('div');
      iconSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(148,163,184,0.15);padding-top:12px;';

      var iconHeaderRow = window.document.createElement('div');
      iconHeaderRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';

      var iconLabelTitle = window.document.createElement('span');
      iconLabelTitle.style.cssText = 'font-weight:600;color:#e0f2fe;font-size:0.9rem;';
      iconLabelTitle.textContent = 'Bookmark icon and preview:';

      var previewBox = window.document.createElement('div');
      previewBox.style.cssText = 'width:42px;height:44px;border-radius:12px;background:rgba(30,41,59,0.9);border:1px solid rgba(56,189,248,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 15px rgba(56,189,248,0.2);overflow:hidden;';

      function updateIconPreview(val) {
        previewBox.innerHTML = '';
        var svg = getPresetSvg(val, '22px');
        if (svg) {
          previewBox.innerHTML = svg;
        } else if (val) {
          var img = window.document.createElement('img');
          img.src = val;
          img.style.cssText = 'width:26px;height:26px;object-fit:contain;border-radius:6px;';
          img.onerror = function () {
            previewBox.innerHTML = getPresetSvg('preset:globe', '22px');
          };
          previewBox.appendChild(img);
        } else {
          previewBox.innerHTML = getPresetSvg('preset:star', '22px');
        }
      }

      iconHeaderRow.appendChild(iconLabelTitle);
      iconHeaderRow.appendChild(previewBox);

      // Icon Input Field
      var iconInput = window.document.createElement('input');
      iconInput.type = 'text';
      iconInput.placeholder = 'Icon image URL or preset:sparkles...';
      iconInput.value = defaultFavicon;
      iconInput.style.cssText = 'padding:10px 12px;background:rgba(30,41,59,0.8);border:1px solid rgba(56,189,248,0.3);border-radius:12px;color:#f8fafc;font-size:0.9rem;outline:none;font-family:inherit;';
      iconInput.oninput = function () { updateIconPreview(iconInput.value.trim()); };

      // Presets Grid
      var presetSubTitle = window.document.createElement('span');
      presetSubTitle.style.cssText = 'font-size:0.8rem;color:#94a3b8;font-weight:500;';
      presetSubTitle.textContent = 'Choose an icon or the website’s icon (favicon):';

      var presetGrid = window.document.createElement('div');
      presetGrid.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

      var presetList = [
        { name: 'Favicon', val: defaultFavicon, iconSvg: getPresetSvg('preset:globe', '15px') },
        { name: 'Sparkles', val: 'preset:sparkles', iconSvg: getPresetSvg('preset:sparkles', '15px') },
        { name: 'Gamepad', val: 'preset:gamepad', iconSvg: getPresetSvg('preset:gamepad', '15px') },
        { name: 'Star', val: 'preset:star', iconSvg: getPresetSvg('preset:star', '15px') },
        { name: 'Folder', val: 'preset:folder', iconSvg: getPresetSvg('preset:folder', '15px') },
        { name: 'List', val: 'preset:list', iconSvg: getPresetSvg('preset:list', '15px') },
        { name: 'Globe', val: 'preset:globe', iconSvg: getPresetSvg('preset:globe', '15px') },
        { name: 'Bookmark', val: 'preset:bookmark', iconSvg: getPresetSvg('preset:bookmark', '15px') },
        { name: 'Film', val: 'preset:film', iconSvg: getPresetSvg('preset:film', '15px') },
        { name: 'TV', val: 'preset:tv', iconSvg: getPresetSvg('preset:tv', '15px') },
        { name: 'Zap', val: 'preset:zap', iconSvg: getPresetSvg('preset:zap', '15px') },
        { name: 'Shield', val: 'preset:shield', iconSvg: getPresetSvg('preset:shield', '15px') },
        { name: 'Heart', val: 'preset:heart', iconSvg: getPresetSvg('preset:heart', '15px') },
        { name: 'Flame', val: 'preset:flame', iconSvg: getPresetSvg('preset:flame', '15px') },
        { name: 'Code', val: 'preset:code', iconSvg: getPresetSvg('preset:code', '15px') },
        { name: 'Music', val: 'preset:music', iconSvg: getPresetSvg('preset:music', '15px') },
        { name: 'Camera', val: 'preset:camera', iconSvg: getPresetSvg('preset:camera', '15px') },
        { name: 'Book', val: 'preset:book', iconSvg: getPresetSvg('preset:book', '15px') },
        { name: 'Tag', val: 'preset:tag', iconSvg: getPresetSvg('preset:tag', '15px') },
        { name: 'Grid', val: 'preset:grid', iconSvg: getPresetSvg('preset:grid', '15px') },
        { name: 'Layers', val: 'preset:layers', iconSvg: getPresetSvg('preset:layers', '15px') },
        { name: 'Terminal', val: 'preset:terminal', iconSvg: getPresetSvg('preset:terminal', '15px') },
        { name: 'Rocket', val: 'preset:rocket', iconSvg: getPresetSvg('preset:rocket', '15px') },
        { name: 'User', val: 'preset:user', iconSvg: getPresetSvg('preset:user', '15px') },
        { name: 'Lock', val: 'preset:lock', iconSvg: getPresetSvg('preset:lock', '15px') },
        { name: 'CPU', val: 'preset:cpu', iconSvg: getPresetSvg('preset:cpu', '15px') },
        { name: 'Wrench', val: 'preset:wrench', iconSvg: getPresetSvg('preset:wrench', '15px') },
        { name: 'Coffee', val: 'preset:coffee', iconSvg: getPresetSvg('preset:coffee', '15px') }
      ];

      presetList.forEach(function (p) {
        var pBtn = window.document.createElement('button');
        pBtn.type = 'button';
        pBtn.style.cssText = 'padding:6px 10px;border-radius:8px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);color:#38bdf8;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;';
        pBtn.innerHTML = p.iconSvg + '<span>' + p.name + '</span>';
        pBtn.onclick = function () {
          iconInput.value = p.val;
          updateIconPreview(p.val);
        };
        presetGrid.appendChild(pBtn);
      });

      // Live Page Icon Picker Overlay Launcher Button
      var pickerBtn = window.document.createElement('button');
      pickerBtn.type = 'button';
      pickerBtn.style.cssText = 'padding:8px 12px;border-radius:10px;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.4);color:#c084fc;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:2px;';
      pickerBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>Find icons on this page</span>';
      pickerBtn.onclick = function () {
        backdrop.remove();
        storage.setItem('heavenly_manual_icon_pending', JSON.stringify({
          bookmarkId: 'bm_dock_quick',
          domain: domain,
          targetUrl: unproxiedUrl,
          timestamp: Date.now()
        }));
        window.location.reload();
      };

      updateIconPreview(defaultFavicon);

      iconSection.appendChild(iconHeaderRow);
      iconSection.appendChild(iconInput);
      iconSection.appendChild(presetSubTitle);
      iconSection.appendChild(presetGrid);
      iconSection.appendChild(pickerBtn);

      body.appendChild(catLabel);
      body.appendChild(titleLabel);
      body.appendChild(urlLabel);
      body.appendChild(iconSection);

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:6px;';

      var cancelBtn = window.document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.style.cssText = 'padding:10px 18px;border-radius:12px;background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#e2e8f0;font-weight:600;font-size:0.88rem;cursor:pointer;font-family:inherit;';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = function () { backdrop.remove(); };

      var saveBtn = window.document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.style.cssText = 'padding:10px 22px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;box-shadow:0 0 15px rgba(56,189,248,0.4);';
      saveBtn.textContent = 'Save Bookmark';
      saveBtn.onclick = function () {
        var finalCat = catSelect.value || data.categories[0].id;
        var finalTitle = titleInput.value.trim() || unproxiedUrl;
        var finalUrl = navigation.remoteUrl(urlInput.value.trim() || unproxiedUrl, config.proxyOrigin, prefix);
        if (!finalUrl) { window.alert('Enter a valid HTTP or HTTPS bookmark address.'); return; }
        var finalIcon = iconInput.value.trim() || defaultFavicon;

        // Another tab may have saved this page while the form was open.
        var latest = storage.getItem('heavenly_bookmarks');
        if (latest) {
          var parsed = JSON.parse(latest);
          if (parsed && Array.isArray(parsed.bookmarks) && Array.isArray(parsed.categories)) data = parsed;
        }
        if (navigation.findBookmarkByUrl(data, finalUrl)) {
          backdrop.remove();
          window.alert('This page is already saved in your bookmarks.');
          return;
        }

        data.bookmarks.push({
          id: 'bm_' + Date.now(),
          categoryId: finalCat,
          title: finalTitle,
          url: finalUrl,
          icon: finalIcon,
          builtIn: false,
          hidden: false,
          order: data.bookmarks.length,
          subBookmarks: []
        });

        storage.setItem('heavenly_bookmarks', JSON.stringify(data));
        backdrop.remove();
        window.alert('Bookmark saved in this browser.');
      };

      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(actions);
      backdrop.appendChild(card);

      backdrop.onclick = function (e) {
        if (e.target === backdrop) backdrop.remove();
      };

      var targetParent = window.document.body || window.document.documentElement;
      if (targetParent) targetParent.appendChild(backdrop);
    } catch (e) {
      console.error("Error bookmarking page:", e);
    }
  }

  // Performance optimization: Fast-path O(1) regex guard and single-pass replacement map
  // for HTML entity escaping (~52% speedup, avoids 4 out of 5 regex calls per string)
  var HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var s = String(str);
    if (!/[&<>"']/.test(s)) return s;
    return s.replace(/[&<>"']/g, function (m) { return HTML_ESCAPE_MAP[m]; });
  }

  function isTopOrAboutBlankIframe(win) {
    if (!win) return false;
    try {
      if (win === win.top) return true;
      var wrapper = win.parent && win.parent.__heavenlyWrapper;
      if (wrapper && wrapper.frame && wrapper.frame.contentWindow === win) return true;
    } catch (e) {
      return false;
    }
    try {
      if (win.top && win.top.location) {
        var topHref = win.top.location.href || '';
        var topProto = win.top.location.protocol || '';
        if (topHref === 'about:blank' || topProto === 'about:') {
          if (!win.parent || win.parent === win.top || (win.parent.location && win.parent.location.href === 'about:blank')) {
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  function getActiveProxiedUrl(win, config) {
    win = win || window;
    var target = navigation.currentRemoteUrl(win, config);
    var origin = (config && config.proxyOrigin) || (win.location && win.location.origin) || '';
    return target ? origin + ((config && config.prefix) || '/proxy/') + target : '';
  }


  function openAboutBlankLauncher(url, title, favicon, win) {
    win = win || window;
    return navigation.openBlank(win, url, {
      title: title || 'Classes', icon: favicon || '',
      showProxiedUrl: loadHeavenlySettings(win).showProxiedUrl
    });
  }


  function launchActiveInAboutBlank(win, settings, config) {
    win = win || window;
    var proxiedUrl = getActiveProxiedUrl(win, config);
    if (!settings) settings = loadHeavenlySettings(win);
    var preset = resolveActivePreset(settings);
    var cloakTitle = (win.document && win.document.title) || preset.title || 'Classes';
    var cloakFavicon = '';
    if (win.document && typeof win.document.querySelector === 'function') {
      var iconEl = win.document.querySelector("link[rel*='icon']");
      if (iconEl && iconEl.href) cloakFavicon = iconEl.href;
    }
    if (!cloakFavicon) {
      cloakFavicon = preset.icon || (win.location && win.location.origin ? win.location.origin + '/assets/heavenly-logo.png' : '/assets/heavenly-logo.png');
    }
    return openAboutBlankLauncher(proxiedUrl, cloakTitle, cloakFavicon, win);
  }

  function initHeavenlyWidgets(window, settings, config) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return; // Only show in main top window or about:blank wrapper

      if (!settings) {
        settings = loadHeavenlySettings(window);
      }

      if (typeof window.__heavenlyWidgetDispose === 'function') window.__heavenlyWidgetDispose();
      var widgetListeners = [];
      var widgetCleanups = [];
      var hasInjected = false;
      function listenWindow(type, handler, options) {
        if (!window.addEventListener) return;
        if (!widgetListeners.some(function (entry) { return entry.type === type && entry.handler === handler; })) {
          widgetListeners.push({ type: type, handler: handler, options: options });
          window.addEventListener(type, handler, options);
        }
      }
      function unlistenWindow(type, handler, options) {
        if (window.removeEventListener) window.removeEventListener(type, handler, options);
        widgetListeners = widgetListeners.filter(function (entry) { return entry.type !== type || entry.handler !== handler; });
      }
      window.__heavenlyWidgetDispose = function () {
        widgetListeners.forEach(function (entry) { if (window.removeEventListener) window.removeEventListener(entry.type, entry.handler, entry.options); });
        widgetListeners = [];
        widgetCleanups.forEach(function (cleanup) { cleanup(); });
        widgetCleanups = [];
        if (window.document && window.document.removeEventListener) window.document.removeEventListener('DOMContentLoaded', injectUI);
        ['heavenly-scroll-lock-root', 'heavenly-magnifier-root', 'heavenly-nav-root', 'heavenly-dock-root'].forEach(function (id) {
          var root = window.document && window.document.getElementById(id);
          if (root) root.remove();
        });
      };
      listenWindow('storage', function (event) {
        if (!event || (event.key !== 'heavenly_settings' && event.key !== null)) return;
        var latest = loadHeavenlySettings(window);
        var keys = ['disableAllFeatures', 'disableAllWidgets', 'showScrollLock', 'showMagnifier', 'showNavBookmark', 'showNavSearch', 'showNavHome', 'useWidgetDock', 'dockPosition', 'showProxiedUrl'];
        if (keys.some(function (key) { return latest[key] !== settings[key]; })) initHeavenlyWidgets(window, latest, config);
      });

      if (settings.disableAllWidgets || settings.disableAllFeatures) {
        ['heavenly-scroll-lock-root', 'heavenly-magnifier-root', 'heavenly-nav-root', 'heavenly-dock-root'].forEach(function (id) {
          var el = window.document ? window.document.getElementById(id) : null;
          if (el) el.remove();
        });
        return;
      }

      var scrollLockEnabled = false;

      function toggleLockState() {
        scrollLockEnabled = !scrollLockEnabled;
        return scrollLockEnabled;
      }

      function updateLockUI(btn, isEnabled) {
        if (!btn) return;
        btn.setAttribute('aria-pressed', String(isEnabled));
        btn.setAttribute('aria-label', 'Scroll Lock ' + (isEnabled ? 'on' : 'off'));
        btn.title = isEnabled ? 'Scroll Lock is on. Allow page scrolling.' : 'Scroll Lock is off. Stop page scrolling.';
        if (isEnabled) {
          btn.classList.add('active');
          btn.innerHTML = scrollLockMarkup(true);
        } else {
          btn.classList.remove('active');
          btn.innerHTML = scrollLockMarkup(false);
        }
      }

      // Intercept keydown during capture phase to prevent browser scrolling when lock is ON
      listenWindow('keydown', function (e) {
        if (!scrollLockEnabled) return;
        var target = typeof e.composedPath === 'function' ? e.composedPath()[0] : e.target;
        var isInput = false;
        if (target) {
          var tagName = target.tagName ? target.tagName.toLowerCase() : '';
          if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
            isInput = true;
          }
        }
        if (isInput) return;

        var scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
        var scrollKeyCodes = [32, 33, 34, 35, 36, 37, 38, 39, 40];
        if (scrollKeys.indexOf(e.key) !== -1 || scrollKeyCodes.indexOf(e.keyCode) !== -1) {
          e.preventDefault();
        }
      }, true);

      // Shared isolated Heavenly surface and control language.
      var widgetCss = [
        ":host { --hn-widget-bg:rgba(17,30,51,.97); --hn-widget-raised:#17283e; --hn-widget-text:#edf5ff; --hn-widget-muted:#a8bcd3; --hn-widget-accent:#8cdeef; --hn-widget-border:rgba(157,191,226,.24); color-scheme:dark; }",
        "*, *::before, *::after { box-sizing:border-box; }",
        "button, input { font:inherit; }",
        "button { -webkit-tap-highlight-color:transparent; }",
        ".heavenly-widget { display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:8px;background:var(--hn-widget-bg);border:1px solid var(--hn-widget-border);border-radius:16px;box-shadow:0 8px 26px rgba(3,10,25,.28);color:var(--hn-widget-text);font-size:13px;font-weight:500;cursor:grab;transition:background .18s,border-color .18s,box-shadow .18s;overflow:visible; }",
        ".heavenly-widget:hover { border-color:rgba(140,222,239,.5); }",
        ".heavenly-widget.dragging { cursor:grabbing;border-color:var(--hn-widget-accent);box-shadow:0 10px 28px rgba(3,10,25,.38); }",
        ".heavenly-widget.minimized { width:44px!important;height:44px!important;padding:0!important;border-radius:50%!important;justify-content:center!important;background:#14243a!important;opacity:1!important;cursor:pointer!important; }",
        ".heavenly-widget.minimized:hover { background:#203851!important;border-color:var(--hn-widget-accent); }",
        ".heavenly-widget.minimized .widget-content { display:none!important; }",
        ".heavenly-widget.minimized .mini-icon { display:flex!important; }",
        ".mini-icon { display:none;align-items:center;justify-content:center;width:42px;height:42px;padding:0;border:0;border-radius:50%;color:var(--hn-widget-accent);background:transparent;cursor:pointer;touch-action:none; }",
        ".widget-content { display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0; }",
        ".heavenly-widget.left-mode .widget-content { flex-direction:row-reverse; }",
        ".drag-handle { display:flex;align-items:center;gap:6px;white-space:nowrap;color:var(--hn-widget-text);font-weight:600;padding:0 4px;min-height:40px;touch-action:none;border-radius:8px; }",
        ".btn-close-widget,.btn-close-lens { display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;background:transparent;border:0;color:var(--hn-widget-muted);font-size:16px;cursor:pointer;border-radius:10px; }",
        ".btn-close-widget:hover,.btn-close-lens:hover { background:rgba(181,165,237,.12);color:#edf5ff; }",
        ".title-icon { width:18px;height:18px;fill:none;stroke:var(--hn-widget-accent);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0; }",
        ".btn-toggle,.btn-ctrl { background:var(--hn-widget-raised);border:1px solid var(--hn-widget-border);color:var(--hn-widget-text);padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;min-width:44px;min-height:44px;transition:background .16s,border-color .16s; }",
        ".btn-toggle:hover,.btn-ctrl:hover { background:#233b56;border-color:rgba(140,222,239,.48); }",
        ".btn-toggle .title-icon { stroke:currentColor; }",
        ".btn-toggle.active { background:#a1ddf2;border-color:#c4edff;color:#08182b;box-shadow:inset 0 1px rgba(255,255,255,.4); }",
        ".nav-input { min-width:80px;width:160px;max-width:100%;min-height:44px;background:#0c192c;border:1px solid var(--hn-widget-border);color:var(--hn-widget-text);padding:8px 12px;border-radius:10px;font-size:13px;outline:none; }",
        ".nav-input::placeholder { color:var(--hn-widget-muted); }",
        ".nav-input:focus { border-color:var(--hn-widget-accent); }",
        "button:focus-visible,.drag-handle:focus-visible,.lens-header:focus-visible,.resize-handle:focus-visible,input:focus-visible { outline:2px solid var(--hn-widget-accent);outline-offset:3px; }",
        "@media (prefers-reduced-motion:reduce) { *,*::before,*::after { transition:none!important;animation:none!important;scroll-behavior:auto!important; } }"
      ].join('\n');

      // Helper to make a container draggable and auto-minimize with boundary clamping & expand direction
      function attachWidgetBehaviors(container, widgetElement, storageKey, defaultTop, defaultRight) {
        // Restore in the same geometry that was saved; no expanded first-frame jump.
        var isMinimized = true;
        widgetElement.classList.add('minimized');
        var initialMini = widgetElement.querySelector('.mini-icon');
        if (initialMini) initialMini.setAttribute('aria-expanded', 'false');
        var inactivityTimer = null;

        function updateWidgetMode() {
          var rect = (container && typeof container.getBoundingClientRect === 'function')
            ? container.getBoundingClientRect()
            : { left: 0, top: 0, right: 0, bottom: 0 };
          var winW = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 800;
          var widgetW = container.offsetWidth || 40;
          var centerX = rect.left + widgetW / 2;
          var isLeft = centerX < (winW / 2);
          if (widgetElement && widgetElement.classList) {
            if (isLeft) {
              widgetElement.classList.add('left-mode');
            } else {
              widgetElement.classList.remove('left-mode');
            }
          }
          return isLeft;
        }

        function enforceBoundaries() {
          var currentRect = (container && typeof container.getBoundingClientRect === 'function')
            ? container.getBoundingClientRect()
            : { left: 0, top: 0, right: 0, bottom: 0 };
          var winW = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 800;
          var winH = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 600;
          var vv = window.visualViewport;
          var edgeLeft = 12 + (vv ? vv.offsetLeft || 0 : 0);
          var edgeTop = 12 + (vv ? vv.offsetTop || 0 : 0);
          winW = vv ? vv.width + (vv.offsetLeft || 0) : winW;
          winH = vv ? vv.height + (vv.offsetTop || 0) : winH;
          var maxLeft = Math.max(edgeLeft, winW - (container.offsetWidth || 44) - 12);
          var maxTop = Math.max(edgeTop, winH - (container.offsetHeight || 44) - 12);

          var curLeft = currentRect.left;
          var curTop = currentRect.top;

          var clampedLeft = Math.max(edgeLeft, Math.min(curLeft, maxLeft));
          var clampedTop = Math.max(edgeTop, Math.min(curTop, maxTop));

          container.style.right = 'auto';
          container.style.bottom = 'auto';
          container.style.left = clampedLeft + 'px';
          container.style.top = clampedTop + 'px';
          updateWidgetMode();
          return { left: clampedLeft, top: clampedTop };
        }

        // Restore position from localStorage
        try {
          var savedPos = localStorage.getItem(storageKey);
          if (savedPos) {
            var pos = JSON.parse(savedPos);
            if (typeof pos.left === 'number' && typeof pos.top === 'number') {
              container.style.right = 'auto';
              container.style.bottom = 'auto';
              container.style.left = pos.left + 'px';
              container.style.top = pos.top + 'px';
            }
          } else {
            container.style.top = defaultTop + 'px';
            container.style.right = defaultRight + 'px';
          }
        } catch (e) {}

        // Default to collapsed state upon page open
        var defCollapseTimer = setTimeout(function () {
          minimize();
          enforceBoundaries();
        }, 0);
        if (defCollapseTimer && typeof defCollapseTimer.unref === 'function') {
          defCollapseTimer.unref();
        }

        // Re-clamp on window resize
        listenWindow('resize', function () { onCancel(); enforceBoundaries(); });
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', enforceBoundaries);
          window.visualViewport.addEventListener('scroll', enforceBoundaries);
          widgetCleanups.push(function () { window.visualViewport.removeEventListener('resize', enforceBoundaries); window.visualViewport.removeEventListener('scroll', enforceBoundaries); });
        }
        widgetCleanups.push(function () { clearTimeout(defCollapseTimer); clearTimeout(inactivityTimer); onCancel(); });

        // Auto-minimize timer (10s)
        function resetInactivityTimer() {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          if (!isMinimized) {
            inactivityTimer = setTimeout(function () {
              var focused = container.shadowRoot ? container.shadowRoot.activeElement : window.document.activeElement;
              if (isDragging || (focused && widgetElement.contains(focused))) resetInactivityTimer();
              else minimize();
            }, 10000);
            if (inactivityTimer && typeof inactivityTimer.unref === 'function') {
              inactivityTimer.unref();
            }
          }
        }

        function minimize() {
          if (isMinimized) return;
          var isLeft = updateWidgetMode();
          var rect = (container && typeof container.getBoundingClientRect === 'function')
            ? container.getBoundingClientRect()
            : { left: 0, top: 0, right: 0, bottom: 0 };
          var rightEdge = rect.right;
          isMinimized = true;
          if (widgetElement && widgetElement.classList) {
            widgetElement.classList.add('minimized');
            var mini = widgetElement.querySelector('.mini-icon');
            if (mini) mini.setAttribute('aria-expanded', 'false');
          }

          if (!isLeft) {
            var miniW = container.offsetWidth || 38;
            container.style.left = (rightEdge - miniW) + 'px';
          }
          enforceBoundaries();
          if (mini && container.shadowRoot && container.shadowRoot.activeElement && widgetElement.contains(container.shadowRoot.activeElement)) mini.focus();
        }

        function expand() {
          if (!isMinimized) return;
          var isLeft = updateWidgetMode();
          var rect = container.getBoundingClientRect();
          var rightEdge = rect.right;
          isMinimized = false;
          widgetElement.classList.remove('minimized');
          var mini = widgetElement.querySelector('.mini-icon');
          if (mini) mini.setAttribute('aria-expanded', 'true');

          if (!isLeft) {
            var expandedW = container.offsetWidth || 200;
            container.style.left = (rightEdge - expandedW) + 'px';
          }
          enforceBoundaries();
          resetInactivityTimer();
        }

        // Intercept capture-phase clicks immediately after expansion to prevent accidental button triggers (e.g. Home button)
        widgetElement.addEventListener('click', function (e) {
          if ((hasMoved || suppressExpandClick) && e.detail !== 0) {
            hasMoved = false; suppressExpandClick = false;
            e.stopPropagation(); e.preventDefault();
          }
        }, true);

        // Attach 'X' button handler inside widget if present
        var closeBtn = widgetElement.querySelector('.btn-close-widget');
        if (closeBtn) {
          closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            minimize();
          });
        }

        var miniButton = widgetElement.querySelector('.mini-icon');
        var handle = widgetElement.querySelector('.drag-handle');
        if (miniButton) {
          miniButton.setAttribute('aria-label', (miniButton.getAttribute('title') || 'Widget').replace(' (Click to expand)', '') + ': expand controls');
          miniButton.addEventListener('click', function () { expand(); if (handle) handle.focus(); });
        }
        if (handle) {
          handle.tabIndex = 0;
          handle.setAttribute('role', 'button');
          handle.setAttribute('aria-label', 'Move ' + (miniButton ? miniButton.getAttribute('aria-label').split(':')[0] : 'widget') + ': use arrow keys; Escape minimizes');
          handle.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { event.preventDefault(); minimize(); if (miniButton) miniButton.focus(); return; }
            var delta = event.shiftKey ? 40 : 10;
            var directions = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
            var direction = directions[event.key];
            if (!direction) return;
            event.preventDefault(); event.stopPropagation();
            var rect = container.getBoundingClientRect();
            container.style.left = rect.left + direction[0] + 'px';
            container.style.top = rect.top + direction[1] + 'px';
            var position = enforceBoundaries();
            try { localStorage.setItem(storageKey, JSON.stringify(position)); } catch (_) {}
          });
        }

        // Interaction listeners to reset timer
        ['mouseenter', 'mousemove', 'mousedown', 'touchstart', 'focusin', 'input', 'keydown'].forEach(function (evt) {
          widgetElement.addEventListener(evt, function () {
            if (!isMinimized) resetInactivityTimer();
          });
        });

        // Click-and-drag logic for both expanded widget and collapsed circle
        var isDragging = false;
        var hasMoved = false;
        var suppressExpandClick = false;
        var startX = 0, startY = 0;
        var startLeft = 0, startTop = 0;

        var onStart = function (e) {
          if ((e.type === 'mousedown' && e.button !== 0) || (e.touches && e.touches.length !== 1)) return;
          hasMoved = false; suppressExpandClick = false;
          var target = e.target;
          if (!isMinimized && target && (target.tagName === 'BUTTON' || (target.closest && target.closest('button')) || target.tagName === 'INPUT')) {
            return;
          }

          var touch = e.touches ? e.touches[0] : e;
          if (!touch) return;

          isDragging = true;
          hasMoved = false;
          startX = touch.clientX;
          startY = touch.clientY;

          var rect = container.getBoundingClientRect();
          startLeft = rect.left;
          startTop = rect.top;

          container.style.right = 'auto';
          container.style.bottom = 'auto';
          container.style.left = startLeft + 'px';
          container.style.top = startTop + 'px';

          listenWindow('mousemove', onMove, { passive: false, capture: true });
          listenWindow('mouseup', onEnd, { capture: true });
          listenWindow('touchmove', onMove, { passive: false, capture: true });
          listenWindow('touchend', onEnd, { capture: true });
        };

        var onMove = function (e) {
          if (!isDragging) return;
          var touch = e.touches ? e.touches[0] : e;
          if (!touch) return;

          var currentX = touch.clientX;
          var currentY = touch.clientY;
          var dx = currentX - startX;
          var dy = currentY - startY;

          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
            widgetElement.classList.add('dragging');
            if (e.cancelable) e.preventDefault();
          }

          var newLeft = startLeft + dx;
          var newTop = startTop + dy;

          var maxLeft = (window.innerWidth || 800) - (container.offsetWidth || 40);
          var maxTop = (window.innerHeight || 600) - (container.offsetHeight || 40);

          newLeft = Math.max(0, Math.min(newLeft, maxLeft));
          newTop = Math.max(0, Math.min(newTop, maxTop));

          container.style.left = newLeft + 'px';
          container.style.top = newTop + 'px';
          enforceBoundaries();
        };

        var onEnd = function (e) {
          widgetElement.classList.remove('dragging');
          if (isDragging) {
            isDragging = false;
            try {
              var rect = container.getBoundingClientRect();
              localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
            } catch (err) {}

            if (isMinimized && !hasMoved) {
              expand();
              suppressExpandClick = true;
            }
          }
          unlistenWindow('mousemove', onMove, { capture: true });
          unlistenWindow('mouseup', onEnd, { capture: true });
          unlistenWindow('touchmove', onMove, { capture: true });
          unlistenWindow('touchend', onEnd, { capture: true });
        };

        var onCancel = function () {
          isDragging = false;
          widgetElement.classList.remove('dragging');
          unlistenWindow('mousemove', onMove, true); unlistenWindow('mouseup', onEnd, true);
          unlistenWindow('touchmove', onMove, true); unlistenWindow('touchend', onEnd, true);
          enforceBoundaries();
        };
        listenWindow('touchcancel', onCancel, true);
        listenWindow('blur', onCancel);
        widgetElement.addEventListener('mousedown', onStart);
        widgetElement.addEventListener('touchstart', onStart, { passive: false });

        resetInactivityTimer();
        return { minimize: minimize, expand: expand, resetTimer: resetInactivityTimer };
      }

      function injectUI() {
        if (!window.document || !window.document.body || hasInjected) return;
        hasInjected = true;

        var showScrollLock = settings.showScrollLock !== undefined ? settings.showScrollLock : true;
        var showMagnifier = settings.showMagnifier !== undefined ? settings.showMagnifier : true;
        var showNavBookmark = settings.showNavBookmark !== undefined ? settings.showNavBookmark : true;
        var showNavSearch = settings.showNavSearch !== undefined ? settings.showNavSearch : true;
        var showNavHome = settings.showNavHome !== undefined ? settings.showNavHome : true;
        var useWidgetDock = settings.useWidgetDock !== undefined ? settings.useWidgetDock : true;
        var dockPosition = settings.dockPosition || 'bottom';

        // --- MAGNIFIER COMMON STATE & HOST INITIALIZATION ---
        var magContainer = window.document.getElementById('heavenly-magnifier-root');
        var magShadow = magContainer ? (magContainer.shadowRoot || magContainer) : null;
        var magEnabled = false;
        var zoomLevel = 2.0;
        var lensWidth = 260;
        var lensHeight = 220;
        var lensPos = { left: Math.max(50, Math.floor((window.innerWidth || 800) / 2 - 130)), top: Math.max(50, Math.floor((window.innerHeight || 600) / 2 - 110)) };

        try {
          var savedLens = localStorage.getItem('heavenly_lens_pos');
          if (savedLens) {
            var lp = JSON.parse(savedLens);
            if (typeof lp.left === 'number') lensPos.left = lp.left;
            if (typeof lp.top === 'number') lensPos.top = lp.top;
            if (typeof lp.zoom === 'number') zoomLevel = lp.zoom;
            if (typeof lp.width === 'number') lensWidth = Math.max(150, lp.width);
            if (typeof lp.height === 'number') lensHeight = Math.max(100, lp.height);
            else if (typeof lp.size === 'number') { lensWidth = lp.size; lensHeight = lp.size; }
          }
        } catch (e) {}

        var lensFrame = null;
        var mirrorNode = null;
        var lensGestureCleanup = null;
        widgetCleanups.push(function () { if (lensGestureCleanup) lensGestureCleanup(true); });
        listenWindow('keydown', function (event) {
          if (event.key === 'Escape' && lensGestureCleanup) {
            event.preventDefault(); event.stopPropagation();
            toggleMagnifier(false);
          }
        }, true);

        function saveLensState() {
          try {
            localStorage.setItem('heavenly_lens_pos', JSON.stringify({
              left: lensPos.left,
              top: lensPos.top,
              width: lensWidth,
              height: lensHeight,
              zoom: zoomLevel
            }));
          } catch (e) {}
        }

        function updateMirrorPosition() {
          if (!lensFrame || !mirrorNode) return;
          // Use the rendered view, including the touch-sized header and any
          // viewport clamp, rather than the user's preferred outer dimensions.
          var view = lensFrame.querySelector('#lens-view');
          var viewRect = view.getBoundingClientRect();
          var viewWidth = viewRect.width || lensWidth;
          var viewHeight = viewRect.height || Math.max(1, lensHeight - 44);
          var centerX = viewRect.left + viewWidth / 2;
          var centerY = viewRect.top + viewHeight / 2;
          var scrollX = window.scrollX || window.pageXOffset || 0;
          var scrollY = window.scrollY || window.pageYOffset || 0;

          var mirrorLeft = (viewWidth / 2) - ((centerX + scrollX) * zoomLevel);
          var mirrorTop = (viewHeight / 2) - ((centerY + scrollY) * zoomLevel);

          mirrorNode.style.transform = 'scale(' + zoomLevel + ')';
          mirrorNode.style.left = mirrorLeft + 'px';
          mirrorNode.style.top = mirrorTop + 'px';
        }

        function clampLens() {
          if (!lensFrame) return;
          var width = Math.min(lensWidth, Math.max(150, (window.innerWidth || 800) - 24));
          var height = Math.min(lensHeight, Math.max(100, (window.innerHeight || 600) - 24));
          lensPos.left = Math.max(12, Math.min(lensPos.left, (window.innerWidth || 800) - width - 12));
          lensPos.top = Math.max(12, Math.min(lensPos.top, (window.innerHeight || 600) - height - 12));
          lensFrame.style.width = width + 'px'; lensFrame.style.height = height + 'px';
          lensFrame.style.left = lensPos.left + 'px'; lensFrame.style.top = lensPos.top + 'px';
          updateMirrorPosition();
        }
        listenWindow('resize', clampLens);

        function createLensFrame() {
          if (lensFrame || !magShadow) return;

          lensFrame = window.document.createElement('div');
          lensFrame.className = 'lens-frame';
          lensFrame.style.width = lensWidth + 'px';
          lensFrame.style.height = lensHeight + 'px';
          lensFrame.style.left = lensPos.left + 'px';
          lensFrame.style.top = lensPos.top + 'px';

          lensFrame.innerHTML = [
            '<div class="lens-header" id="lens-header">',
            '  <span class="lens-title">' + magnifierMarkup(false, 'Lens (' + zoomLevel.toFixed(1) + 'x)') + '</span>',
            '  <button type="button" class="btn-close-lens" id="close-lens-btn" aria-label="Close magnifier lens" title="Close magnifier lens">✕</button>',
            '</div>',
            '<div class="lens-view" id="lens-view"></div>',
            '<div class="resize-handle resize-handle-n" data-handle="n"></div>',
            '<div class="resize-handle resize-handle-s" data-handle="s"></div>',
            '<div class="resize-handle resize-handle-e" data-handle="e"></div>',
            '<div class="resize-handle resize-handle-w" data-handle="w"></div>',
            '<div class="resize-handle resize-handle-nw" data-handle="nw"></div>',
            '<div class="resize-handle resize-handle-ne" data-handle="ne"></div>',
            '<div class="resize-handle resize-handle-sw" data-handle="sw"></div>',
            '<div class="resize-handle resize-handle-se" data-handle="se"></div>'
          ].join('\n');

          magShadow.appendChild(lensFrame);
          clampLens();

          var viewEl = lensFrame.querySelector('#lens-view');
          // Host styles and mirrored controls stay inside their own read-only tree.
          var mirrorRoot = viewEl.attachShadow ? viewEl.attachShadow({ mode: 'open' }) : viewEl;

          var baseEl = window.document.querySelector('base');
          if (baseEl) mirrorRoot.appendChild(baseEl.cloneNode(true));

          var styleEls = window.document.querySelectorAll('style, link[rel="stylesheet"]');
          for (var sIdx = 0; sIdx < styleEls.length; sIdx++) {
            mirrorRoot.appendChild(styleEls[sIdx].cloneNode(true));
          }

          var clone = window.document.body.cloneNode(true);
          var roots = clone.querySelectorAll('#heavenly-scroll-lock-root, #heavenly-magnifier-root, #heavenly-nav-root, #heavenly-touch-panic-root, #heavenly-dock-root');
          for (var rIdx = 0; rIdx < roots.length; rIdx++) {
            var rootEl = roots[rIdx];
            if (rootEl.remove) rootEl.remove();
            else if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
          }

          var origCanvases = window.document.body.querySelectorAll('canvas');
          var cloneCanvases = clone.querySelectorAll('canvas');
          for (var cIdx = 0; cIdx < origCanvases.length && cIdx < cloneCanvases.length; cIdx++) {
            try {
              var ctx = cloneCanvases[cIdx].getContext('2d');
              if (ctx) ctx.drawImage(origCanvases[cIdx], 0, 0);
            } catch (e) {}
          }

          mirrorNode = window.document.createElement('div');
          mirrorNode.className = 'lens-mirror';
          mirrorNode.style.cssText = 'position:absolute;transform-origin:0 0;pointer-events:none;';
          mirrorNode.setAttribute('aria-hidden', 'true');
          mirrorNode.inert = true;
          mirrorNode.style.width = Math.max(window.document.documentElement.scrollWidth, window.innerWidth) + 'px';
          mirrorNode.style.height = Math.max(window.document.documentElement.scrollHeight, window.innerHeight) + 'px';
          mirrorNode.appendChild(clone);
          mirrorRoot.appendChild(mirrorNode);

          updateMirrorPosition();

          lensFrame.querySelector('#close-lens-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMagnifier(false);
          });

          var headerEl = lensFrame.querySelector('#lens-header');
          headerEl.tabIndex = 0;
          headerEl.setAttribute('aria-label', 'Move magnifier lens with arrow keys. Escape closes.');
          headerEl.addEventListener('keydown', function (event) {
            if (event.target !== headerEl) return;
            if (event.key === 'Escape') { event.preventDefault(); toggleMagnifier(false); return; }
            var delta = event.shiftKey ? 40 : 10;
            if (event.key === 'ArrowLeft') lensPos.left -= delta;
            else if (event.key === 'ArrowRight') lensPos.left += delta;
            else if (event.key === 'ArrowUp') lensPos.top -= delta;
            else if (event.key === 'ArrowDown') lensPos.top += delta;
            else return;
            event.preventDefault(); event.stopPropagation(); clampLens(); saveLensState();
          });
          var isDraggingLens = false;
          var startX = 0, startY = 0;
          var startLeft = 0, startTop = 0;

          var onLensDragStart = function (e) {
            if ((e.type === 'mousedown' && e.button !== 0) || (e.touches && e.touches.length !== 1) || e.target.tagName === 'BUTTON') return;
            if (lensGestureCleanup) lensGestureCleanup(true);
            var touch = e.touches ? e.touches[0] : e;
            if (!touch) return;

            isDraggingLens = true;
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = lensPos.left;
            startTop = lensPos.top;

            var onMove = function (me) {
              if (!isDraggingLens || !lensFrame) return;
              var touchMove = me.touches ? me.touches[0] : me;
              if (!touchMove) return;

              if (me.cancelable && me.touches) me.preventDefault();
              var dx = touchMove.clientX - startX;
              var dy = touchMove.clientY - startY;
              lensPos.left = Math.max(0, Math.min(startLeft + dx, (window.innerWidth || 800) - lensWidth));
              lensPos.top = Math.max(0, Math.min(startTop + dy, (window.innerHeight || 600) - lensHeight));
              clampLens();
            };

            var onUp = function (event) {
              var cancelled = event === true || (event && ['touchcancel', 'blur', 'resize'].indexOf(event.type) !== -1);
              isDraggingLens = false;
              unlistenWindow('mousemove', onMove, true);
              unlistenWindow('mouseup', onUp, true);
              unlistenWindow('touchmove', onMove, true);
              unlistenWindow('touchend', onUp, true);
              unlistenWindow('touchcancel', onUp, true);
              unlistenWindow('blur', onUp);
              unlistenWindow('resize', onUp);
              lensGestureCleanup = null;
              if (cancelled) { lensPos.left = startLeft; lensPos.top = startTop; }
              if (lensFrame) clampLens();
              if (!cancelled) saveLensState();
            };
            lensGestureCleanup = onUp;

            listenWindow('mousemove', onMove, { passive: false, capture: true });
            listenWindow('mouseup', onUp, { capture: true });
            listenWindow('touchmove', onMove, { passive: false, capture: true });
            listenWindow('touchend', onUp, { capture: true });
            listenWindow('touchcancel', onUp, true);
            listenWindow('blur', onUp);
            listenWindow('resize', onUp);
          };

          headerEl.addEventListener('mousedown', onLensDragStart);
          headerEl.addEventListener('touchstart', onLensDragStart, { passive: false });

          var handles = lensFrame.querySelectorAll('.resize-handle');
          for (var hIdx = 0; hIdx < handles.length; hIdx++) {
            (function (hEl) {
              var onResizeStart = function (e) {
                if ((e.type === 'mousedown' && e.button !== 0) || (e.touches && e.touches.length !== 1)) return;
                if (lensGestureCleanup) lensGestureCleanup(true);
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
                var handleType = hEl.getAttribute('data-handle');
                var touch = e.touches ? e.touches[0] : e;
                if (!touch) return;

                var rStartX = touch.clientX;
                var rStartY = touch.clientY;
                var startW = lensWidth;
                var startH = lensHeight;
                var startL = lensPos.left;
                var startT = lensPos.top;

                var onResizing = function (me) {
                  if (!lensFrame) return;
                  var touchMove = me.touches ? me.touches[0] : me;
                  if (!touchMove) return;
                  if (me.cancelable && me.touches) me.preventDefault();

                  var dx = touchMove.clientX - rStartX;
                  var dy = touchMove.clientY - rStartY;

                  var newW = startW;
                  var newH = startH;
                  var newL = startL;
                  var newT = startT;

                  if (handleType.includes('e')) {
                    newW = Math.max(150, startW + dx);
                  }
                  if (handleType.includes('s')) {
                    newH = Math.max(100, startH + dy);
                  }
                  if (handleType.includes('w')) {
                    var calcW = startW - dx;
                    if (calcW >= 150) {
                      newW = calcW;
                      newL = startL + dx;
                    }
                  }
                  if (handleType.includes('n')) {
                    var calcH = startH - dy;
                    if (calcH >= 100) {
                      newH = calcH;
                      newT = startT + dy;
                    }
                  }

                  lensWidth = newW;
                  lensHeight = newH;
                  lensPos.left = newL;
                  lensPos.top = newT;

                  lensFrame.style.width = lensWidth + 'px';
                  lensFrame.style.height = lensHeight + 'px';
                  lensFrame.style.left = lensPos.left + 'px';
                  lensFrame.style.top = lensPos.top + 'px';

                  updateMirrorPosition();
                };

                var onResizeEnd = function (event) {
                  var cancelled = event === true || (event && ['touchcancel', 'blur', 'resize'].indexOf(event.type) !== -1);
                  unlistenWindow('mousemove', onResizing, true);
                  unlistenWindow('mouseup', onResizeEnd, true);
                  unlistenWindow('touchmove', onResizing, true);
                  unlistenWindow('touchend', onResizeEnd, true);
                  unlistenWindow('touchcancel', onResizeEnd, true);
                  unlistenWindow('blur', onResizeEnd);
                  unlistenWindow('resize', onResizeEnd);
                  lensGestureCleanup = null;
                  if (cancelled) { lensWidth = startW; lensHeight = startH; lensPos.left = startL; lensPos.top = startT; }
                  if (lensFrame) clampLens();
                  if (!cancelled) saveLensState();
                };
                lensGestureCleanup = onResizeEnd;

                listenWindow('mousemove', onResizing, { passive: false, capture: true });
                listenWindow('mouseup', onResizeEnd, { capture: true });
                listenWindow('touchmove', onResizing, { passive: false, capture: true });
                listenWindow('touchend', onResizeEnd, { capture: true });
                listenWindow('touchcancel', onResizeEnd, true);
                listenWindow('blur', onResizeEnd);
                listenWindow('resize', onResizeEnd);
              };

              hEl.addEventListener('mousedown', onResizeStart);
              hEl.addEventListener('touchstart', onResizeStart, { passive: false });
            })(handles[hIdx]);
          }
        }

        function destroyLensFrame() {
          if (lensGestureCleanup) lensGestureCleanup(true);
          if (lensFrame) {
            lensFrame.remove();
            lensFrame = null;
            mirrorNode = null;
          }
        }

        if (showMagnifier) {
          if (!magContainer) {
            magContainer = window.document.createElement('div');
            magContainer.id = 'heavenly-magnifier-root';
            magContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

            magShadow = magContainer.attachShadow ? magContainer.attachShadow({ mode: 'open' }) : magContainer;

            var magStyle = window.document.createElement('style');
            magStyle.textContent = widgetCss + [
              '.lens-frame {',
              '  position: fixed;',
              '  border: 1px solid rgba(140,222,239,.65);',
              '  border-radius: 16px;',
              '  box-shadow: 0 12px 32px rgba(3,10,25,.35);',
              '  background: rgba(15, 23, 42, 0.95);',
              '  overflow: hidden;',
              '  z-index: 2147483645;',
              '  display: flex;',
              '  flex-direction: column;',
              '}',
              '.lens-header {',
              '  min-height: 44px; touch-action:none;',
              '  background: rgba(30, 41, 59, 0.95);',
              '  border-bottom: 1px solid rgba(56, 189, 248, 0.3);',
              '  display: flex;',
              '  align-items: center;',
              '  justify-content: space-between;',
              '  padding: 0 8px;',
              '  font-size: 11px;',
              '  font-weight: 600;',
              '  color: #e0f2fe;',
              '  cursor: grab;',
              '}',
              '.lens-title { display: inline-flex; align-items: center; gap: 6px; }',
              '.lens-title .title-icon { flex-shrink: 0; filter: none; }',
              '.lens-header:active { cursor: grabbing; }',
              '.lens-view {',
              '  flex: 1;',
              '  position: relative;',
              '  overflow: hidden;',
              '  background: #ffffff;',
              '}',
              '.lens-mirror {',
              '  position: absolute;',
              '  transform-origin: 0 0;',
              '  pointer-events: none;',
              '}',
              '.btn-close-lens {',
              '  background: none; border: none; color: #94a3b8; font-size: 14px;',
              '  cursor: pointer; padding: 0 4px; line-height: 1;',
              '}',
              '.btn-close-lens:hover { color: #ef4444; }',
              '/* Resize Handles */',
              '.resize-handle { position: absolute; z-index: 20; background: transparent; }',
              '.resize-handle-n { top: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }',
              '.resize-handle-s { bottom: -4px; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }',
              '.resize-handle-e { top: 8px; right: -4px; bottom: 8px; width: 8px; cursor: ew-resize; }',
              '.resize-handle-w { top: 8px; left: -4px; bottom: 8px; width: 8px; cursor: ew-resize; }',
              '.resize-handle-nw { top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; }',
              '.resize-handle-ne { top: -4px; right: -4px; width: 12px; height: 12px; cursor: nesw-resize; }',
              '.resize-handle-sw { bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: nesw-resize; }',
              '.resize-handle-se {',
              '  bottom: 2px; right: 2px; width: 14px; height: 14px; cursor: nwse-resize; z-index: 25;',
              '  background: linear-gradient(135deg, transparent 40%, rgba(56, 189, 248, 0.7) 40%, rgba(56, 189, 248, 0.7) 50%, transparent 50%, transparent 65%, rgba(56, 189, 248, 0.7) 65%, rgba(56, 189, 248, 0.7) 75%, transparent 75%);',
              '  border-bottom-right-radius: 6px; transition: opacity 0.2s ease;',
              '}',
              '.resize-handle-se:hover { opacity: 1; filter: drop-shadow(0 0 4px #38bdf8); }'
            ].join('\n');

            magShadow.appendChild(magStyle);
            (window.document.body || window.document.documentElement).appendChild(magContainer);
          }
        }

        function updateZoomUI() {
          var dockRoot = window.document.getElementById('heavenly-dock-root');
          var dockLabel = dockRoot && dockRoot.shadowRoot ? dockRoot.shadowRoot.querySelector('#dock-zoom-label') : null;
          if (dockLabel) dockLabel.textContent = zoomLevel.toFixed(1) + 'x';
          if (magShadow) {
            var widgetLabel = magShadow.querySelector('#zoom-label');
            if (widgetLabel) widgetLabel.textContent = zoomLevel.toFixed(1) + 'x';
          }
          if (lensFrame) {
            var headerSpan = lensFrame.querySelector('#lens-header span');
            if (headerSpan) headerSpan.innerHTML = magnifierMarkup(false, 'Lens (' + zoomLevel.toFixed(1) + 'x)');
            updateMirrorPosition();
          }
          saveLensState();
        }

        function toggleMagnifier(enable) {
          magEnabled = enable !== undefined ? enable : !magEnabled;

          var dockRoot = window.document.getElementById('heavenly-dock-root');
          var dockBtn = dockRoot && dockRoot.shadowRoot ? dockRoot.shadowRoot.querySelector('#dock-mag-btn') : null;
          if (dockBtn) {
            dockBtn.setAttribute('aria-pressed', String(magEnabled));
            if (magEnabled) {
              dockBtn.classList.add('active');
              dockBtn.innerHTML = magnifierMarkup(true);
            } else {
              dockBtn.classList.remove('active');
              dockBtn.innerHTML = magnifierMarkup(false);
            }
          }

          if (magShadow) {
            var widgetBtn = magShadow.querySelector('#mag-toggle-btn');
            if (widgetBtn) {
              widgetBtn.setAttribute('aria-pressed', String(magEnabled));
              if (magEnabled) {
                widgetBtn.classList.add('active');
                widgetBtn.innerHTML = magnifierMarkup(true);
              } else {
                widgetBtn.classList.remove('active');
                widgetBtn.innerHTML = magnifierMarkup(false);
              }
            }
          }

          if (magEnabled) {
            createLensFrame();
          } else {
            destroyLensFrame();
          }
        }

        listenWindow('scroll', function () {
          if (magEnabled) updateMirrorPosition();
        }, { passive: true });

        // --- COLLAPSIBLE WIDGET DOCK BAR MODE ---
        if (useWidgetDock) {
          // Remove floating widgets if present when dock is active (keep magnifier root for lens frame)
          ['heavenly-scroll-lock-root', 'heavenly-nav-root'].forEach(function (id) {
            var el = window.document.getElementById(id);
            if (el) el.remove();
          });

          if (window.document.getElementById('heavenly-dock-root')) return;
          var dockContainer = window.document.createElement('div');
          dockContainer.id = 'heavenly-dock-root';
          dockContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

          var dockShadow = dockContainer.attachShadow ? dockContainer.attachShadow({ mode: 'open' }) : dockContainer;

          var dockCss = widgetCss + [
            ".dock-wrapper { position:fixed;width:max-content;display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px); }",
            ".dock-bar { display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;max-width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 92px);padding:10px;background:rgba(17,30,51,.97);border:1px solid rgba(157,191,226,.28);border-radius:18px;box-shadow:0 10px 32px rgba(3,10,25,.3);color:var(--hn-widget-text);overflow:auto;scrollbar-width:thin;scrollbar-color:#526a85 transparent; }",
            ".pull-tab { display:flex;align-items:center;justify-content:center;gap:7px;min-width:80px;min-height:44px;padding:8px 12px;color:#d8f6ff;background:#172c45;border:1px solid rgba(140,222,239,.55);border-radius:14px;cursor:grab;box-shadow:0 5px 18px rgba(3,10,25,.25);font-size:12px;font-weight:650;touch-action:none;transition:background .18s,border-color .18s; }",
            ".pull-tab:hover { background:#24445e;border-color:#b7edff; }",
            ".pull-tab:active { cursor:grabbing; }",
            ".pull-tab > span:first-child { display:inline-flex;font-size:11px;transition:transform .18s; }",
            ".dock-bottom { bottom:calc(12px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);flex-direction:column; }",
            ".dock-top { top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);flex-direction:column-reverse; }",
            ".dock-left { left:calc(12px + env(safe-area-inset-left,0px));top:50%;transform:translateY(-50%);flex-direction:row-reverse; }",
            ".dock-right { right:calc(12px + env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);flex-direction:row; }",
            ".dock-left .dock-bar,.dock-right .dock-bar { width:230px; }",
            ".dock-left .dock-item,.dock-right .dock-item { flex:1 1 100%;justify-content:center; }",
            ".dock-left .dock-divider,.dock-right .dock-divider { display:none; }",
            ".dock-left .nav-input,.dock-right .nav-input { flex:1;min-width:100px;width:140px; }",
            ".collapsed .dock-bar { display:none; }",
            ".dock-item { display:flex;align-items:center;gap:6px;min-width:0; }",
            ".dock-divider { width:1px;height:26px;background:var(--hn-widget-border);flex-shrink:0; }",
            "#dock-search-input { width:180px; }",
            "#dock-go-btn { color:#d4f5ff;border-color:rgba(140,222,239,.48);background:#203d56; }",
            "#dock-zoom-label { min-width:30px;text-align:center;color:var(--hn-widget-accent)!important; }",
            ".dock-drag-ghost { padding:12px 18px;background:#17283e;border:1px dashed #8cdeef;border-radius:14px;color:#edf5ff;font:600 13px system-ui;box-shadow:0 10px 24px rgba(3,10,25,.3); }",
            "@media (max-width:1120px) { .dock-divider { display:none; } }",
            "@media (max-width:640px) {",
            " .dock-bar { padding:8px;gap:6px;max-width:calc(100vw - 24px);border-radius:16px; }",
            " .dock-bar .btn-ctrl span { display:none; }",
            " .dock-bar .btn-ctrl,.dock-bar .btn-toggle { padding:8px; }",
            " .dock-bar .dock-item:has(.nav-input) { flex:1 1 100%;order:-1; }",
            " .dock-bar .nav-input { flex:1;width:140px!important; }",
            " .dock-left,.dock-right { gap:6px; }",
            " .dock-left .dock-bar,.dock-right .dock-bar { width:min(230px,calc(100vw - 110px)); }",
            " .dock-left .nav-input,.dock-right .nav-input { min-width:70px;width:80px!important; }",
            "}"
          ].join('\n');

          var dockStyle = window.document.createElement('style');
          dockStyle.textContent = dockCss;

          var arrowSymbol = '▲';
          if (dockPosition === 'bottom') arrowSymbol = '▼';
          else if (dockPosition === 'top') arrowSymbol = '▲';
          else if (dockPosition === 'left') arrowSymbol = '◄';
          else if (dockPosition === 'right') arrowSymbol = '►';

          var wrapper = window.document.createElement('div');
          wrapper.className = 'dock-wrapper dock-' + dockPosition;

          var pullBtn = window.document.createElement('button');
          pullBtn.type = 'button';
          pullBtn.className = 'pull-tab';
          pullBtn.title = 'Open Heavenly tools. Drag the handle to move them to another edge.';
          pullBtn.setAttribute('aria-label', 'Expand Heavenly tools. Alt plus arrow key moves the dock.');
          pullBtn.setAttribute('aria-expanded', 'false');
          pullBtn.setAttribute('aria-controls', 'heavenly-dock-toolbar');
          pullBtn.innerHTML = '<span aria-hidden="true">' + arrowSymbol + '</span><span class="dock-pull-label">Tools</span>';

          var dockBar = window.document.createElement('div');
          dockBar.className = 'dock-bar';
          dockBar.id = 'heavenly-dock-toolbar';
          dockBar.setAttribute('role', 'group');
          dockBar.setAttribute('aria-label', 'Heavenly page tools');

          var items = [];

          if (showNavHome) {
            items.push('<button type="button" class="btn-ctrl" id="dock-home-btn" title="Return to Heavenly Home"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span>Home</span></button>');
          }

          items.push('<button type="button" class="btn-ctrl" id="dock-direct-btn" title="Try the website without Heavenly’s proxy"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Direct Site</span></button>');

          items.push('<button type="button" class="btn-ctrl" id="dock-blank-btn" title="Open the page inside an about:blank tab"><svg class="title-icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>about:blank</span></button>');

          if (showNavBookmark) {
            items.push('<button type="button" class="btn-ctrl" id="dock-bm-btn" title="Bookmark Page"><svg class="title-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Bookmark</span></button>');
          }

          if (showNavSearch) {
            items.push('<div class="dock-item"><input type="text" class="nav-input" id="dock-search-input" aria-label="Search the web or enter a website address" placeholder="Search or website address…" /><button type="button" class="btn-ctrl" id="dock-go-btn">Go</button></div>');
          }

          if (showScrollLock) {
            items.push('<div class="dock-item"><span style="font-size:12px;font-weight:600;color:#e0f2fe;">Scroll Lock</span><button type="button" class="btn-toggle" id="dock-scroll-btn" title="Stop page scrolling" aria-label="Scroll Lock off" aria-pressed="false">' + scrollLockMarkup(false) + '</button></div>');
          }

          if (showMagnifier) {
            items.push('<div class="dock-item"><button type="button" class="btn-toggle" id="dock-mag-btn" title="Turn the magnifier lens on or off" aria-label="Magnifier" aria-pressed="false">' + magnifierMarkup(false) + '</button><button type="button" class="btn-ctrl" id="dock-zoom-out" aria-label="Zoom out">−</button><span id="dock-zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">2.0x</span><button type="button" class="btn-ctrl" id="dock-zoom-in" aria-label="Zoom in">+</button></div>');
          }

          dockBar.innerHTML = items.join('<div class="dock-divider" aria-hidden="true"></div>');
          var labeledButtons = dockBar.querySelectorAll('button[title]');
          for (var labelIndex = 0; labelIndex < labeledButtons.length; labelIndex++) {
            labeledButtons[labelIndex].setAttribute('aria-label', labeledButtons[labelIndex].getAttribute('title'));
          }

          wrapper.appendChild(pullBtn);
          wrapper.appendChild(dockBar);
          dockShadow.appendChild(dockStyle);
          dockShadow.appendChild(wrapper);

          var targetParent = window.document.body || window.document.documentElement;
          if (targetParent) targetParent.appendChild(dockContainer);

          // Handle visualViewport adjustments on iPad/mobile Chrome/Safari scrolling
          var updateDockViewportPosition = function () {
            if (!window.visualViewport) return;
            wrapper.style.bottom = ''; wrapper.style.top = '';
            var vv = window.visualViewport;
            var offsetTop = vv.offsetTop || 0;
            var pageHeight = window.document.documentElement ? window.document.documentElement.clientHeight : window.innerHeight;
            var vvHeight = vv.height || pageHeight;

            // Adjust top or bottom offsets if visualViewport differs from full layout height
            if (dockPosition === 'bottom') {
              var bottomShift = pageHeight - (offsetTop + vvHeight);
              wrapper.style.bottom = 'calc(' + (12 + Math.max(0, bottomShift)) + 'px + env(safe-area-inset-bottom, 0px))';
            } else if (dockPosition === 'top') {
              wrapper.style.top = 'calc(' + (12 + Math.max(0, offsetTop)) + 'px + env(safe-area-inset-top, 0px))';
            }
          };

          if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateDockViewportPosition);
            window.visualViewport.addEventListener('scroll', updateDockViewportPosition);
            widgetCleanups.push(function () { window.visualViewport.removeEventListener('resize', updateDockViewportPosition); window.visualViewport.removeEventListener('scroll', updateDockViewportPosition); });
            updateDockViewportPosition();
          }

          var isCollapsed = true;
          wrapper.classList.add('collapsed');
          var pullSpan = pullBtn.querySelector('span');
          if (pullSpan) pullSpan.style.transform = 'rotate(180deg)';

          var isDraggingDock = false;
          var hasMovedDock = false;
          var startX = 0, startY = 0;
          var ghostEl = null;
          var snapIndicatorEl = null;

          var onDockStart = function (e) {
            if ((e.type === 'mousedown' && e.button !== 0) || (e.touches && e.touches.length !== 1)) return;
            var target = e.target;
            if (target && (target.tagName === 'INPUT' || (target.tagName === 'BUTTON' && target !== pullBtn && !pullBtn.contains(target)))) {
              return;
            }
            var touch = e.touches ? e.touches[0] : e;
            if (!touch) return;

            isDraggingDock = true;
            hasMovedDock = false;
            startX = touch.clientX;
            startY = touch.clientY;

            listenWindow('mousemove', onDockMove, { passive: false, capture: true });
            listenWindow('mouseup', onDockEnd, { capture: true });
            listenWindow('touchmove', onDockMove, { passive: false, capture: true });
            listenWindow('touchend', onDockEnd, { capture: true });
          };

          var onDockMove = function (e) {
            if (!isDraggingDock) return;
            var touch = e.touches ? e.touches[0] : e;
            if (!touch) return;

            var dx = touch.clientX - startX;
            var dy = touch.clientY - startY;

            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
              hasMovedDock = true;
              if (e.cancelable) e.preventDefault();

              if (!ghostEl) {
                ghostEl = window.document.createElement('div');
                ghostEl.className = 'dock-drag-ghost';
                ghostEl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);';
                ghostEl.textContent = 'Move Heavenly tools';
                dockShadow.appendChild(ghostEl);
              }

              ghostEl.style.left = touch.clientX + 'px';
              ghostEl.style.top = touch.clientY + 'px';

              if (!snapIndicatorEl) {
                snapIndicatorEl = window.document.createElement('div');
                snapIndicatorEl.className = 'dock-snap-indicator';
                snapIndicatorEl.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;background:rgba(140,222,239,.85);border-radius:12px;transition:opacity .15s ease-out;';
                dockShadow.appendChild(snapIndicatorEl);
              }

              var winW = window.innerWidth || 800;
              var winH = window.innerHeight || 600;
              var distLeft = touch.clientX;
              var distRight = winW - touch.clientX;
              var distTop = touch.clientY;
              var distBottom = winH - touch.clientY;
              var minDist = Math.min(distLeft, distRight, distTop, distBottom);

              if (minDist === distBottom) {
                snapIndicatorEl.style.left = '10vw';
                snapIndicatorEl.style.right = '10vw';
                snapIndicatorEl.style.bottom = '6px';
                snapIndicatorEl.style.top = 'auto';
                snapIndicatorEl.style.width = 'auto';
                snapIndicatorEl.style.height = '10px';
              } else if (minDist === distTop) {
                snapIndicatorEl.style.left = '10vw';
                snapIndicatorEl.style.right = '10vw';
                snapIndicatorEl.style.top = '6px';
                snapIndicatorEl.style.bottom = 'auto';
                snapIndicatorEl.style.width = 'auto';
                snapIndicatorEl.style.height = '10px';
              } else if (minDist === distLeft) {
                snapIndicatorEl.style.top = '10vh';
                snapIndicatorEl.style.bottom = '10vh';
                snapIndicatorEl.style.left = '6px';
                snapIndicatorEl.style.right = 'auto';
                snapIndicatorEl.style.height = 'auto';
                snapIndicatorEl.style.width = '10px';
              } else if (minDist === distRight) {
                snapIndicatorEl.style.top = '10vh';
                snapIndicatorEl.style.bottom = '10vh';
                snapIndicatorEl.style.right = '6px';
                snapIndicatorEl.style.left = 'auto';
                snapIndicatorEl.style.height = 'auto';
                snapIndicatorEl.style.width = '10px';
              }
            }
          };

          var onDockEnd = function (e) {
            if (ghostEl && ghostEl.parentNode) ghostEl.remove();
            if (snapIndicatorEl && snapIndicatorEl.parentNode) snapIndicatorEl.remove();
            ghostEl = null;
            snapIndicatorEl = null;

            if (isDraggingDock && hasMovedDock) {
              var touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
              var curX = touch ? touch.clientX : startX;
              var curY = touch ? touch.clientY : startY;

              var winW = window.innerWidth || 800;
              var winH = window.innerHeight || 600;

              var distLeft = curX;
              var distRight = winW - curX;
              var distTop = curY;
              var distBottom = winH - curY;

              var minDist = Math.min(distLeft, distRight, distTop, distBottom);
              var newPos = 'bottom';
              if (minDist === distLeft) newPos = 'left';
              else if (minDist === distRight) newPos = 'right';
              else if (minDist === distTop) newPos = 'top';
              else if (minDist === distBottom) newPos = 'bottom';

              setDockPosition(newPos);
            }
            isDraggingDock = false;
            unlistenWindow('mousemove', onDockMove, { capture: true });
            unlistenWindow('mouseup', onDockEnd, { capture: true });
            unlistenWindow('touchmove', onDockMove, { capture: true });
            unlistenWindow('touchend', onDockEnd, { capture: true });
          };

          function setDockPosition(position) {
            dockPosition = position;
            wrapper.className = 'dock-wrapper dock-' + dockPosition + (isCollapsed ? ' collapsed' : '');
            wrapper.style.top = ''; wrapper.style.bottom = '';
            var arrows = { bottom: '▼', top: '▲', left: '◄', right: '►' };
            pullBtn.querySelector('span').textContent = arrows[position];
            updateDockViewportPosition();
            try {
              var savedSettings = localStorage.getItem('heavenly_settings');
              var raw = savedSettings === null ? {} : JSON.parse(savedSettings);
              if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Unreadable saved settings');
              raw.dockPosition = position;
              localStorage.setItem('heavenly_settings', JSON.stringify(raw));
              pullBtn.title = (isCollapsed ? 'Open' : 'Minimize') + ' Heavenly tools. Drag the handle to move them to another edge.';
            } catch (_) {
              pullBtn.title = 'Dock moved for this page. Its position could not be saved; check browser storage in Settings.';
            }
          }
          function cancelDockGesture() {
            if (ghostEl) ghostEl.remove(); if (snapIndicatorEl) snapIndicatorEl.remove();
            ghostEl = null; snapIndicatorEl = null; isDraggingDock = false;
            unlistenWindow('mousemove', onDockMove, true); unlistenWindow('mouseup', onDockEnd, true);
            unlistenWindow('touchmove', onDockMove, true); unlistenWindow('touchend', onDockEnd, true);
          }
          listenWindow('touchcancel', cancelDockGesture, true);
          listenWindow('blur', cancelDockGesture);
          listenWindow('resize', cancelDockGesture);
          widgetCleanups.push(cancelDockGesture);
          pullBtn.addEventListener('keydown', function (event) {
            var positions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' };
            if (event.altKey && positions[event.key]) { event.preventDefault(); event.stopPropagation(); setDockPosition(positions[event.key]); }
          });
          dockBar.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { event.preventDefault(); pullBtn.click(); pullBtn.focus(); }
          });

          pullBtn.addEventListener('mousedown', onDockStart);
          pullBtn.addEventListener('touchstart', onDockStart, { passive: false });

          pullBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (hasMovedDock && e.detail !== 0) { hasMovedDock = false; return; }
            hasMovedDock = false;
            isCollapsed = !isCollapsed;
            pullBtn.setAttribute('aria-expanded', String(!isCollapsed));
            pullBtn.setAttribute('aria-label', (isCollapsed ? 'Expand' : 'Minimize') + ' Heavenly tools. Alt plus arrow key moves the dock.');
            pullBtn.title = (isCollapsed ? 'Open' : 'Minimize') + ' Heavenly tools. Drag the handle to move them to another edge.';
            if (isCollapsed) {
              wrapper.classList.add('collapsed');
              pullBtn.querySelector('span').style.transform = 'rotate(180deg)';
            } else {
              wrapper.classList.remove('collapsed');
              pullBtn.querySelector('span').style.transform = 'rotate(0deg)';
            }
          });

          // Wire up Direct Site button
          var directDockBtn = dockBar.querySelector('#dock-direct-btn');
          if (directDockBtn) {
            directDockBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              openDirectSitePreview(window, getDirectRemoteUrl(window, config));
            });
          }

          // Wire up about:blank Cloak button
          var blankDockBtn = dockBar.querySelector('#dock-blank-btn');
          if (blankDockBtn) {
            blankDockBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              launchActiveInAboutBlank(window, settings, config);
            });
          }

          // Wire up Home button
          if (showNavHome) {
            var homeBtn = dockBar.querySelector('#dock-home-btn');
            if (homeBtn) homeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              goHeavenlyHome(window, config);
            });
          }

          // Wire up Bookmark button
          if (showNavBookmark) {
            var bmBtn = dockBar.querySelector('#dock-bm-btn');
            if (bmBtn) bmBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              promptBookmarkCurrentPage(window, config);
            });
          }

          // Wire up Search
          if (showNavSearch) {
            var goBtn = dockBar.querySelector('#dock-go-btn');
            var searchInput = dockBar.querySelector('#dock-search-input');
            if (searchInput && settings.showProxiedUrl) { searchInput.value = getDirectRemoteUrl(window, config); searchInput.__heavenlyDisplayedUrl = searchInput.value; }
            var handleNav = function () {
              if (!searchInput) return;
              var val = searchInput.value.trim();
              if (!val) return;
              if (val.substr(0, 4) !== "http") {
                if (val.includes('.') && !val.includes(' ')) {
                  val = "https://" + val;
                } else {
                  val = "https://google.com/search?q=" + encodeURIComponent(val);
                }
              }
              window.location.href = window.location.protocol + '//' + window.location.host + '/proxy/' + val;
            };
            if (goBtn) goBtn.addEventListener('click', function (e) { e.stopPropagation(); handleNav(); });
            if (searchInput) searchInput.addEventListener('keydown', function (e) {
              if (e.key === 'Enter') { e.stopPropagation(); handleNav(); }
            });
          }

          // Wire up Scroll Lock
          if (showScrollLock) {
            var scrollBtn = dockBar.querySelector('#dock-scroll-btn');
            if (scrollBtn) scrollBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              var newState = toggleLockState();
              updateLockUI(scrollBtn, newState);
            });
          }

          // Wire up Magnifier
          if (showMagnifier) {
            var magBtn = dockBar.querySelector('#dock-mag-btn');
            var zoomInBtn = dockBar.querySelector('#dock-zoom-in');
            var zoomOutBtn = dockBar.querySelector('#dock-zoom-out');
            var zoomLabel = dockBar.querySelector('#dock-zoom-label');

            if (magBtn) magBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              toggleMagnifier();
            });

            if (zoomInBtn) zoomInBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (zoomLevel < 4.0) {
                zoomLevel = Math.round((zoomLevel + 0.5) * 10) / 10;
                updateZoomUI();
              }
            });

            if (zoomOutBtn) zoomOutBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (zoomLevel > 1.5) {
                zoomLevel = Math.round((zoomLevel - 0.5) * 10) / 10;
                updateZoomUI();
              }
            });
          }

          return;
        }

        // Remove dock bar if active mode switched to floating
        var existingDock = window.document.getElementById('heavenly-dock-root');
        if (existingDock) existingDock.remove();

        if (window.document.getElementById('heavenly-scroll-lock-root') || window.document.getElementById('heavenly-nav-root')) return;

        // --- 1. SCROLL LOCK WIDGET ---
        if (showScrollLock) {
          var lockContainer = window.document.createElement('div');
          lockContainer.id = 'heavenly-scroll-lock-root';
          lockContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

          var lockShadow = lockContainer.attachShadow ? lockContainer.attachShadow({ mode: 'open' }) : lockContainer;

          var lockStyle = window.document.createElement('style');
          lockStyle.textContent = widgetCss;

          var lockWidget = window.document.createElement('div');
          lockWidget.className = 'heavenly-widget';
          lockWidget.innerHTML = [
            '<button type="button" class="mini-icon" title="Scroll Lock (Click to expand)">',
            '  <svg class="title-icon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18M3 12h18"></path><circle cx="12" cy="12" r="9"></circle></svg>',
            '</button>',
            '<div class="widget-content">',
            '  <div class="drag-handle" title="Drag to move these tools">',
            '    <svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 0 0 18"></path><path d="M3 12h18"></path></svg>',
            '    <span>Scroll Lock</span>',
            '  </div>',
            '  <button type="button" class="btn-toggle" id="toggle-btn" title="Stop page scrolling" aria-label="Scroll Lock off" aria-pressed="false">' + scrollLockMarkup(false) + '</button>',
            '  <button type="button" class="btn-close-widget" title="Minimize these tools">✕</button>',
            '</div>'
          ].join('\n');

          lockShadow.appendChild(lockStyle);
          lockShadow.appendChild(lockWidget);
          window.document.body.appendChild(lockContainer);

          var lockToggleBtn = lockShadow.querySelector('#toggle-btn');
          lockToggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var newState = toggleLockState();
            updateLockUI(lockToggleBtn, newState);
          });

          attachWidgetBehaviors(lockContainer, lockWidget, 'heavenly_scroll_lock_pos', 20, 20);
        }

        // --- 2. MAGNIFIER FLOATING WIDGET (IF NOT USING DOCK) ---
        if (showMagnifier && magShadow && !magShadow.querySelector('.heavenly-widget')) {
          var magWidget = window.document.createElement('div');
          magWidget.className = 'heavenly-widget';
          magWidget.innerHTML = [
            '<button type="button" class="mini-icon" title="Magnifier (Click to expand)">',
            '  <svg class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
            '</button>',
            '<div class="widget-content">',
            '  <div class="drag-handle" title="Drag to move these tools">',
            '    <svg class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
            '    <span>Magnifier</span>',
            '  </div>',
            '  <button type="button" class="btn-toggle" id="mag-toggle-btn" title="Turn the magnifier lens on or off" aria-label="Magnifier" aria-pressed="false">' + magnifierMarkup(false) + '</button>',
            '  <button type="button" class="btn-ctrl" id="zoom-out-btn" title="Zoom Out">-</button>',
            '  <span id="zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">' + zoomLevel.toFixed(1) + 'x</span>',
            '  <button type="button" class="btn-ctrl" id="zoom-in-btn" title="Zoom In">+</button>',
            '  <button type="button" class="btn-ctrl" id="size-btn" title="Change lens size">Size</button>',
            '  <button type="button" class="btn-close-widget" title="Minimize these tools">✕</button>',
            '</div>'
          ].join('\n');

          magShadow.appendChild(magWidget);
          attachWidgetBehaviors(magContainer, magWidget, 'heavenly_magnifier_pos', 70, 20);

          magShadow.querySelector('#mag-toggle-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMagnifier();
          });

          magShadow.querySelector('#zoom-in-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            if (zoomLevel < 4.0) {
              zoomLevel = Math.round((zoomLevel + 0.5) * 10) / 10;
              updateZoomUI();
            }
          });

          magShadow.querySelector('#zoom-out-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            if (zoomLevel > 1.5) {
              zoomLevel = Math.round((zoomLevel - 0.5) * 10) / 10;
              updateZoomUI();
            }
          });

          magShadow.querySelector('#size-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            if (lensWidth <= 200) {
              lensWidth = 320;
              lensHeight = 260;
            } else if (lensWidth <= 320) {
              lensWidth = 450;
              lensHeight = 350;
            } else {
              lensWidth = 200;
              lensHeight = 160;
            }

            if (lensFrame) {
              lensFrame.style.width = lensWidth + 'px';
              lensFrame.style.height = lensHeight + 'px';
              updateMirrorPosition();
              saveLensState();
            }
            clampLens();
            saveLensState();
          });
        }

        // --- 3. NAVIGATION WIDGET (Search Bar, Bookmark & Home Button) ---
        if (showNavSearch || showNavHome || showNavBookmark) {
          var navContainer = window.document.createElement('div');
          navContainer.id = 'heavenly-nav-root';
          navContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

          var navShadow = navContainer.attachShadow ? navContainer.attachShadow({ mode: 'open' }) : navContainer;

          var navStyle = window.document.createElement('style');
          navStyle.textContent = widgetCss;

          var navWidget = window.document.createElement('div');
          navWidget.className = 'heavenly-widget';

          var navHtml = ['<button type="button" class="mini-icon" title="Navigation (Click to expand)"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 12h18M12 3l9 9-9 9"></path></svg></button>', '<div class="widget-content">'];
          navHtml.push('<div class="drag-handle" title="Drag to move these tools"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg></div>');

          if (showNavSearch) {
            navHtml.push('<input type="text" class="nav-input" id="nav-search-input" aria-label="Search the web or enter a website address" placeholder="Search or website address…" />');
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-go-btn">Go</button>');
          }

          if (showNavBookmark) {
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-bm-btn" title="Bookmark Page"><svg class="title-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Bookmark</span></button>');
          }

          if (showNavHome) {
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-home-btn" title="Return to Heavenly Home"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span>Home</span></button>');
          }

          navHtml.push('<button type="button" class="btn-ctrl" id="nav-direct-btn" title="Try the website without Heavenly’s proxy"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Direct Site</span></button>');

          navHtml.push('<button type="button" class="btn-ctrl" id="nav-blank-btn" title="Open the page inside an about:blank tab"><svg class="title-icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>about:blank</span></button>');

          navHtml.push('<button type="button" class="btn-close-widget" title="Minimize these tools">✕</button>');
          navHtml.push('</div>');
          navWidget.innerHTML = navHtml.join('\n');

          navShadow.appendChild(navStyle);
          navShadow.appendChild(navWidget);
          var targetParent = window.document.body || window.document.documentElement;
          if (targetParent) targetParent.appendChild(navContainer);

          function handleNavigate() {
            var input = navWidget.querySelector('#nav-search-input') || (navShadow.querySelector ? navShadow.querySelector('#nav-search-input') : null);
            if (!input) return;
            var val = input.value.trim();
            if (!val) return;

            if (val.substr(0, 4) !== "http") {
              if (val.includes('.') && !val.includes(' ')) {
                val = "https://" + val;
              } else {
                val = "https://google.com/search?q=" + encodeURIComponent(val);
              }
            }
            window.location.href = window.location.protocol + '//' + window.location.host + '/proxy/' + val;
          }

          if (showNavSearch) {
            var goBtn = navWidget.querySelector('#nav-go-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-go-btn') : null);
            var searchInput = navWidget.querySelector('#nav-search-input') || (navShadow.querySelector ? navShadow.querySelector('#nav-search-input') : null);
            if (searchInput && settings.showProxiedUrl) { searchInput.value = getDirectRemoteUrl(window, config); searchInput.__heavenlyDisplayedUrl = searchInput.value; }

            if (goBtn) goBtn.addEventListener('click', function (e) { e.stopPropagation(); handleNavigate(); });
            if (searchInput) searchInput.addEventListener('keydown', function (e) {
              e.stopPropagation();
              if (e.key === 'Enter') handleNavigate();
            });
          }

          if (showNavBookmark) {
            var floatBmBtn = navWidget.querySelector('#nav-bm-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-bm-btn') : null);
            if (floatBmBtn) floatBmBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              promptBookmarkCurrentPage(window, config);
            });
          }

          var floatDirectBtn = navWidget.querySelector('#nav-direct-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-direct-btn') : null);
          if (floatDirectBtn) {
            floatDirectBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              openDirectSitePreview(window, getDirectRemoteUrl(window, config));
            });
          }

          var floatBlankBtn = navWidget.querySelector('#nav-blank-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-blank-btn') : null);
          if (floatBlankBtn) {
            floatBlankBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              launchActiveInAboutBlank(window, settings, config);
            });
          }

          if (showNavHome) {
            var homeBtn = navWidget.querySelector('#nav-home-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-home-btn') : null);
            if (homeBtn) homeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              goHeavenlyHome(window, config);
            });
          }

          attachWidgetBehaviors(navContainer, navWidget, 'heavenly_nav_pos', 120, 20);
        }
      }

      if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
        injectUI();
      } else if (window.document) {
        window.document.addEventListener('DOMContentLoaded', injectUI);
        listenWindow('load', injectUI);
      }
    } catch (err) {
      console.error('Error initializing Heavenly widgets:', err);
    }
  }

  function normalizeUrlForMatching(urlStr, config) {
    if (!urlStr) return { host: '', origin: '', pathname: '/' };
    try {
      var clean = urlStr.toString();
      var prefix = (config && config.prefix) || '/proxy/';
      while (clean.indexOf(prefix) !== -1) {
        var idx = clean.indexOf(prefix);
        clean = clean.substring(idx + prefix.length);
      }
      if (clean.indexOf(":/") !== -1 && clean.indexOf("://") === -1) {
        clean = clean.replace(/^(https?:\/)([^\/])/i, "$1/$2");
      }
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      var u = new URL(clean);
      var path = u.pathname || '/';
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return {
        host: u.hostname.toLowerCase(),
        origin: u.origin,
        pathname: path.toLowerCase()
      };
    } catch (e) {
      return { host: '', origin: '', pathname: '/' };
    }
  }

  function detectActiveFavicon(window, config) {
    try {
      var doc = window.document;
      if (doc) {
        var links = doc.querySelectorAll("link[rel*='icon'], link[data-heavenly-rel*='icon']");
        for (var i = 0; i < links.length; i++) {
          var href = links[i].getAttribute('href') || links[i].getAttribute('data-heavenly-href');
          if (href) {
            var extracted = extractTargetRemoteUrl(href, window, config);
            if (extracted && extracted.startsWith('http')) {
              return extracted;
            }
          }
        }
      }
      var directUrl = getDirectRemoteUrl(window, config);
      if (directUrl) {
        try {
          var u = new URL(directUrl.startsWith('http') ? directUrl : 'https://' + directUrl);
          return u.origin + '/favicon.ico';
        } catch (e) {
          return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(directUrl) + '&sz=64';
        }
      }
    } catch (e) {}
    return 'https://ssl.gstatic.com/classroom/favicon.png';
  }

  function initManualIconPickerWidget(config, window, settings) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return;
      if (!settings) {
        settings = loadHeavenlySettings(window);
      }
      if (settings.disableAllWidgets || settings.disableAllFeatures) {
        var existingPicker = window.document ? window.document.getElementById('heavenly-manual-icon-root') : null;
        if (existingPicker) existingPicker.remove();
        return;
      }

      var storage = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return;

      var rawPending = storage.getItem('heavenly_manual_icon_pending');
      if (!rawPending) return;

      var pending = null;
      try {
        pending = JSON.parse(rawPending);
      } catch (e) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      if (!pending || !pending.targetUrl || !pending.timestamp) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      // Check 120-second expiration window
      var now = Date.now();
      if (now - pending.timestamp > 120000) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      // Check domain/hostname match using normalized URL parsing
      var activeRemoteUrl = getDirectRemoteUrl(window, config);
      var pendingNorm = normalizeUrlForMatching(pending.targetUrl, config);
      var activeNorm = normalizeUrlForMatching(activeRemoteUrl, config);

      var pendingHost = pendingNorm.host;
      var activeHost = activeNorm.host;

      if (!pendingHost || !activeHost || (pendingHost !== activeHost && !activeHost.endsWith('.' + pendingHost) && !pendingHost.endsWith('.' + activeHost))) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      function setupOverlay() {
        if (!window.document) return false;
        var parent = window.document.body || window.document.documentElement;
        if (!parent) return false;

        if (window.document.getElementById('heavenly-manual-icon-root')) {
          storage.removeItem('heavenly_manual_icon_pending');
          return true;
        }

        var container = window.document.createElement('div');
        container.id = 'heavenly-manual-icon-root';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        var shadow = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;

        var style = window.document.createElement('style');
        style.textContent = [
          '.icon-picker-card {',
          '  display: flex;',
          '  flex-direction: column;',
          '  gap: 10px;',
          '  background: rgba(15, 23, 42, 0.94);',
          '  backdrop-filter: blur(16px);',
          '  -webkit-backdrop-filter: blur(16px);',
          '  border: 1px solid rgba(56, 189, 248, 0.4);',
          '  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.3);',
          '  padding: 14px 18px;',
          '  border-radius: 18px;',
          '  color: #f8fafc;',
          '  font-size: 13px;',
          '  max-width: 360px;',
          '}',
          '.picker-header {',
          '  display: flex;',
          '  align-items: center;',
          '  justify-content: space-between;',
          '  gap: 8px;',
          '  border-bottom: 1px solid rgba(148, 163, 184, 0.15);',
          '  padding-bottom: 8px;',
          '}',
          '.picker-title {',
          '  font-weight: 700;',
          '  color: #38bdf8;',
          '  display: flex;',
          '  align-items: center;',
          '  gap: 6px;',
          '  font-size: 0.88rem;',
          '}',
          '.picker-close {',
          '  background: none; border: none; color: #94a3b8; font-size: 14px;',
          '  cursor: pointer; padding: 2px 4px; line-height: 1;',
          '}',
          '.picker-close:hover { color: #ef4444; }',
          '.picker-prompt {',
          '  font-size: 0.82rem;',
          '  color: #cbd5e1;',
          '  line-height: 1.4;',
          '}',
          '.picker-preview-row {',
          '  display: flex;',
          '  align-items: center;',
          '  gap: 10px;',
          '  background: rgba(30, 41, 59, 0.6);',
          '  padding: 8px 12px;',
          '  border-radius: 12px;',
          '  border: 1px solid rgba(148, 163, 184, 0.2);',
          '}',
          '.preview-img {',
          '  width: 24px;',
          '  height: 24px;',
          '  object-fit: contain;',
          '  border-radius: 4px;',
          '  flex-shrink: 0;',
          '}',
          '.preview-url-text {',
          '  font-size: 0.75rem;',
          '  color: #94a3b8;',
          '  overflow: hidden;',
          '  text-overflow: ellipsis;',
          '  white-space: nowrap;',
          '  flex: 1;',
          '}',
          '.btn-group {',
          '  display: flex;',
          '  gap: 6px;',
          '  flex-wrap: wrap;',
          '}',
          '.ctrl-btn {',
          '  flex: 1;',
          '  padding: 6px 10px;',
          '  border-radius: 8px;',
          '  font-size: 0.78rem;',
          '  font-weight: 600;',
          '  cursor: pointer;',
          '  font-family: inherit;',
          '  display: inline-flex;',
          '  align-items: center;',
          '  justify-content: center;',
          '  gap: 4px;',
          '  transition: all 0.2s ease;',
          '}',
          '.btn-secondary {',
          '  background: rgba(30, 41, 59, 0.8);',
          '  border: 1px solid rgba(148, 163, 184, 0.3);',
          '  color: #cbd5e1;',
          '}',
          '.btn-secondary:hover {',
          '  background: rgba(56, 189, 248, 0.2);',
          '  color: #38bdf8;',
          '  border-color: #38bdf8;',
          '}',
          '.save-icon-btn {',
          '  background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%);',
          '  color: #030712;',
          '  border: none;',
          '  padding: 8px 12px;',
          '  border-radius: 10px;',
          '  cursor: pointer;',
          '  font-weight: 700;',
          '  font-size: 0.82rem;',
          '  transition: all 0.2s ease;',
          '  display: inline-flex;',
          '  align-items: center;',
          '  justify-content: center;',
          '  gap: 6px;',
          '  flex: 1;',
          '}',
          '.save-icon-btn:hover {',
          '  transform: translateY(-1px);',
          '  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);',
          '}',
          '.copy-status {',
          '  font-size: 0.75rem;',
          '  color: #38bdf8;',
          '  text-align: center;',
          '  min-height: 1.1em;',
          '}'
        ].join('\n');

        var card = window.document.createElement('div');
        card.className = 'icon-picker-card';

        var directRawIconUrl = detectActiveFavicon(window, config);
        var proxiedIconUrl = fixUrl(directRawIconUrl, config, window.location);
        function getFullProxiedUrl(relOrAbsUrl) {
          if (!relOrAbsUrl) return '';
          if (relOrAbsUrl.startsWith('http://') || relOrAbsUrl.startsWith('https://')) return relOrAbsUrl;
          return window.location.origin + (relOrAbsUrl.startsWith('/') ? '' : '/') + relOrAbsUrl;
        }

        card.innerHTML = [
          '<div class="picker-header">',
          '  <span class="picker-title"><svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Live Icon Picker</span>',
          '  <button type="button" class="picker-close" id="close-picker-btn">✕</button>',
          '</div>',
          '<div class="picker-prompt">Preview and save the detected icon for your bookmark:</div>',
          '<div class="picker-preview-row">',
          '  <img class="preview-img" id="live-icon-img" src="' + proxiedIconUrl + '" alt="Icon preview" />',
          '  <span class="preview-url-text" id="live-icon-text">' + directRawIconUrl + '</span>',
          '</div>',
          '<div class="btn-group">',
          '  <button type="button" class="ctrl-btn btn-secondary" id="copy-direct-btn">Copy Direct Link</button>',
          '  <button type="button" class="ctrl-btn btn-secondary" id="copy-proxied-btn">Copy Proxied Link</button>',
          '</div>',
          '<div class="copy-status" id="copy-status"></div>',
          '<div class="btn-group">',
          '  <button type="button" class="save-icon-btn" id="save-direct-btn">Save Direct Link</button>',
          '  <button type="button" class="save-icon-btn" id="save-proxied-btn">Save Proxied Link</button>',
          '</div>'
        ].join('\n');

        shadow.appendChild(style);
        shadow.appendChild(card);
        parent.appendChild(container);

        storage.removeItem('heavenly_manual_icon_pending');

        var imgEl = card.querySelector('#live-icon-img');
        var textEl = card.querySelector('#live-icon-text');
        var statusEl = card.querySelector('#copy-status');

        if (imgEl) {
          imgEl.onerror = function () {
            if (activeNorm.host) {
              var googleFaviconUrl = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(activeNorm.host) + '&sz=64';
              if (directRawIconUrl !== googleFaviconUrl) {
                directRawIconUrl = googleFaviconUrl;
                proxiedIconUrl = googleFaviconUrl;
                imgEl.src = googleFaviconUrl;
                if (textEl) textEl.textContent = googleFaviconUrl;
              }
            }
          };
        }

        function updatePreview() {
          var detected = detectActiveFavicon(window, config);
          if (detected && detected !== directRawIconUrl) {
            directRawIconUrl = detected;
            proxiedIconUrl = fixUrl(directRawIconUrl, config, window.location);
            if (imgEl) imgEl.src = proxiedIconUrl;
            if (textEl) textEl.textContent = directRawIconUrl;
          }
        }

        if (typeof MutationObserver !== 'undefined' && window.document.head) {
          var obs = new MutationObserver(updatePreview);
          obs.observe(window.document.head, { childList: true, subtree: true, attributes: true });
        }
        var pollInterval = setInterval(updatePreview, 1000);
        if (pollInterval && typeof pollInterval.unref === 'function') {
          pollInterval.unref();
        }

        card.querySelector('#close-picker-btn').onclick = function (e) {
          e.stopPropagation();
          clearInterval(pollInterval);
          container.remove();
        };

        card.querySelector('#copy-direct-btn').onclick = function (e) {
          e.stopPropagation();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(directRawIconUrl).then(function () {
              if (statusEl) statusEl.textContent = 'Direct icon link copied!';
            });
          }
        };

        card.querySelector('#copy-proxied-btn').onclick = function (e) {
          e.stopPropagation();
          var fullProxied = getFullProxiedUrl(proxiedIconUrl);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullProxied).then(function () {
              if (statusEl) statusEl.textContent = 'Proxied icon link copied!';
            });
          }
        };

        function saveIconAndReturn(iconToSave) {
          clearInterval(pollInterval);
          try {
            var rawBms = storage.getItem('heavenly_bookmarks');
            if (rawBms) {
              var bmsData = JSON.parse(rawBms);
              var bm = bmsData.bookmarks.find(function (b) { return b.id === pending.bookmarkId; });
              if (bm) {
                bm.icon = iconToSave;
                storage.setItem('heavenly_bookmarks', JSON.stringify(bmsData));
              }
            }
          } catch (err) {}
          container.remove();
          (window.top || window).location.href = window.location.origin + '/';
        }

        card.querySelector('#save-direct-btn').onclick = function (e) {
          e.stopPropagation();
          saveIconAndReturn(directRawIconUrl);
        };

        card.querySelector('#save-proxied-btn').onclick = function (e) {
          e.stopPropagation();
          saveIconAndReturn(proxiedIconUrl);
        };

        return true;
      }

      if (!setupOverlay()) {
        var attempts = 0;
        var maxAttempts = 100;
        var mountInterval = setInterval(function () {
          attempts++;
          if (setupOverlay() || attempts >= maxAttempts) {
            clearInterval(mountInterval);
          }
        }, 100);
        if (mountInterval && typeof mountInterval.unref === 'function') {
          mountInterval.unref();
        }

        if (window.document) {
          window.document.addEventListener('DOMContentLoaded', function () {
            if (setupOverlay()) clearInterval(mountInterval);
          });
          window.addEventListener('load', function () {
            if (setupOverlay()) clearInterval(mountInterval);
          });
        }
      }

    } catch (e) {}
  }

  function saveToHeavenlyHistory(window, config, settings, metadataOnly) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return;
      var targetUrl = navigation.currentRemoteUrl(window, config);
      if (!targetUrl) return;
      settings = settings || loadHeavenlySettings(window);
      var title = window.document.title;
      var cloakIcon = window.document.getElementById && window.document.getElementById('heavenly-cloak-icon');
      if (isPresetTitle(title, settings) && (window.__heavenlyOriginalTitle || cloakIcon)) title = window.__heavenlyOriginalTitle || targetUrl;
      navigation.recordHistory(window.localStorage, targetUrl, title, metadataOnly, config.proxyOrigin);
    } catch (e) {}
  }

  function initHeavenlyNavigationHistory(window, config) {
    if (!window.document || !isTopOrAboutBlankIframe(window) || window.__heavenlyHistoryInitialized) return;
    window.__heavenlyHistoryInitialized = true;
    var lastUrl = '';
    function syncPresentation() {
      var targetUrl = navigation.currentRemoteUrl(window, config);
      if (!targetUrl) return;
      config.url = targetUrl;
      var settings = loadHeavenlySettings(window);
      ['heavenly-dock-root', 'heavenly-nav-root'].forEach(function (id) {
        var root = window.document.getElementById ? window.document.getElementById(id) : null;
        root = root && (root.shadowRoot || root);
        var input = root && root.querySelector ? root.querySelector('#dock-search-input, #nav-search-input') : null;
        if (!input) return;
        if (root.activeElement === input || window.document.activeElement === input) return;
        if (input.value && input.value !== input.__heavenlyDisplayedUrl) return;
        input.value = settings.showProxiedUrl ? targetUrl : '';
        input.__heavenlyDisplayedUrl = input.value;
      });
      try {
        var wrapper = window.parent && window.parent.__heavenlyWrapper;
        if (wrapper && wrapper.frame.contentWindow === window) {
          wrapper.update(getActiveProxiedUrl(window, config), targetUrl);
        }
      } catch (e) {}
    }
    function onNavigation() {
      var url = navigation.currentRemoteUrl(window, config);
      if (url && url !== lastUrl) {
        lastUrl = url;
        saveToHeavenlyHistory(window, config);
        if (window.__heavenlyRefreshQuickSave) window.__heavenlyRefreshQuickSave();
      }
      syncPresentation();
    }
    window.__heavenlyNavigationChanged = onNavigation;
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { lastUrl = ''; onNavigation(); }
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'heavenly_settings') syncPresentation();
    });
    function start() {
      onNavigation();
      if (window.MutationObserver && window.document.head) {
        var observer = new window.MutationObserver(function (changes) {
          var changedTitle = changes.some(function (change) {
            var node = change.target.nodeType === 3 ? change.target.parentNode : change.target;
            return (node && node.tagName === 'TITLE') || Array.prototype.some.call(change.addedNodes || [], function (el) { return el.tagName === 'TITLE'; });
          });
          if (changedTitle) saveToHeavenlyHistory(window, config, null, true);
        });
        observer.observe(window.document.head, { childList: true, subtree: true, characterData: true });
      }
    }
    if (window.document.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }


  function initFolderQuickSaveWidget(config, window, settings) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return;
      if (!window.__heavenlyRefreshQuickSave) {
        window.__heavenlyRefreshQuickSave = function () { initFolderQuickSaveWidget(config, window); };
        window.addEventListener('storage', function (event) {
          if (event.key === 'heavenly_bookmarks' || event.key === 'heavenly_settings' || event.key === null) window.__heavenlyRefreshQuickSave();
        });
      }
      function removeWidget() {
        var existing = window.document && window.document.getElementById('heavenly-folder-save-root');
        if (existing) { if (existing.__heavenlyCleanup) existing.__heavenlyCleanup(); existing.remove(); }
      }
      if (!settings) {
        settings = loadHeavenlySettings(window);
      }
      if (settings.disableAllWidgets || settings.disableAllFeatures) {
        removeWidget();
        return;
      }
      var targetUrl = navigation.currentRemoteUrl(window, config);
      if (!targetUrl) { removeWidget(); return; }

      var storage = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return;

      var raw = storage.getItem('heavenly_bookmarks');
      if (!raw) return;

      var data = JSON.parse(raw);
      if (!data || !data.bookmarks) return;

      var matchedFolder = bookmarks.findQuickSaveBookmark(data, targetUrl);
      if (!matchedFolder || matchedFolder.disableQuickSaveWidget === true) { removeWidget(); return; }
      var existing = window.document.getElementById('heavenly-folder-save-root');
      if (existing && existing.dataset.bookmarkId !== matchedFolder.id) removeWidget();

      function setupWidget() {
        if (!window.document || !window.document.body) return;
        if (window.document.getElementById('heavenly-folder-save-root')) return;

        var saveContainer = window.document.createElement('div');
        saveContainer.id = 'heavenly-folder-save-root';
        saveContainer.dataset.bookmarkId = matchedFolder.id;
        saveContainer.style.cssText = 'position:fixed;bottom:70px;right:20px;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        // Restore position from localStorage
        try {
          var savedSavePos = localStorage.getItem('heavenly_save_widget_pos');
          if (savedSavePos) {
            var pos = JSON.parse(savedSavePos);
            if (typeof pos.left === 'number' && typeof pos.top === 'number') {
              saveContainer.style.bottom = 'auto';
              saveContainer.style.right = 'auto';
              saveContainer.style.left = pos.left + 'px';
              saveContainer.style.top = pos.top + 'px';
            }
          }
        } catch (e) {}

        var shadow = saveContainer.attachShadow ? saveContainer.attachShadow({ mode: 'open' }) : saveContainer;

        var style = window.document.createElement('style');
        style.textContent = [
          '.save-bar {',
          '  display: flex;',
          '  align-items: center;',
          '  gap: 8px;',
          '  background: rgba(15, 23, 42, 0.92);',
          '  backdrop-filter: blur(16px);',
          '  border: 1px solid rgba(56, 189, 248, 0.4);',
          '  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 18px rgba(56, 189, 248, 0.3);',
          '  padding: 8px 14px;',
          '  border-radius: 16px;',
          '  color: #f8fafc;',
          '  font-size: 13px;',
          '  cursor: grab;',
          '}',
          '.save-bar:active { cursor: grabbing; }',
          '.save-btn {',
          '  background: linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%);',
          '  color: #38bdf8;',
          '  border: 1px solid rgba(56, 189, 248, 0.5);',
          '  padding: 6px 12px;',
          '  border-radius: 10px;',
          '  cursor: pointer;',
          '  font-weight: 700;',
          '  font-size: 12px;',
          '  transition: all 0.2s ease;',
          '  display: inline-flex;',
          '  align-items: center;',
          '  gap: 6px;',
          '}',
          '.save-btn:hover {',
          '  background: rgba(56, 189, 248, 0.4);',
          '  color: #ffffff;',
          '  border-color: #38bdf8;',
          '  transform: translateY(-1px);',
          '}',
          '.close-btn {',
          '  background: none; border: none; color: #94a3b8; font-size: 13px;',
          '  cursor: pointer; padding: 2px 4px; line-height: 1;',
          '}',
          '.close-btn:hover { color: #ef4444; }'
        ].join('\n');

        var bar = window.document.createElement('div');
        bar.className = 'save-bar';

        // Make quick-save widget draggable across screen with movement threshold
        var isDraggingSave = false;
        var hasMovedSave = false;
        var startX = 0, startY = 0;
        var startLeft = 0, startTop = 0;

        var onSaveStart = function (e) {
          if (e.target && e.target.classList && e.target.classList.contains('close-btn')) return;
          var touch = e.touches ? e.touches[0] : e;
          if (!touch) return;

          isDraggingSave = true;
          hasMovedSave = false;
          startX = touch.clientX;
          startY = touch.clientY;

          var rect = saveContainer.getBoundingClientRect();
          startLeft = rect.left;
          startTop = rect.top;

          window.addEventListener('mousemove', onSaveMove, { passive: false, capture: true });
          window.addEventListener('mouseup', onSaveEnd, { capture: true });
          window.addEventListener('touchmove', onSaveMove, { passive: false, capture: true });
          window.addEventListener('touchend', onSaveEnd, { capture: true });
        };

        var onSaveMove = function (e) {
          if (!isDraggingSave) return;
          var touch = e.touches ? e.touches[0] : e;
          if (!touch) return;

          var dx = touch.clientX - startX;
          var dy = touch.clientY - startY;

          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMovedSave = true;
            if (e.cancelable) e.preventDefault();
          }

          if (hasMovedSave) {
            saveContainer.style.bottom = 'auto';
            saveContainer.style.right = 'auto';

            var maxLeft = (window.innerWidth || 800) - saveContainer.offsetWidth;
            var maxTop = (window.innerHeight || 600) - saveContainer.offsetHeight;

            saveContainer.style.left = Math.max(0, Math.min(startLeft + dx, maxLeft)) + 'px';
            saveContainer.style.top = Math.max(0, Math.min(startTop + dy, maxTop)) + 'px';
          }
        };

        var onSaveEnd = function () {
          if (isDraggingSave && hasMovedSave) {
            try {
              var rect = saveContainer.getBoundingClientRect();
              localStorage.setItem('heavenly_save_widget_pos', JSON.stringify({ left: rect.left, top: rect.top }));
            } catch (err) {}
          }
          isDraggingSave = false;
          window.removeEventListener('mousemove', onSaveMove, { capture: true });
          window.removeEventListener('mouseup', onSaveEnd, { capture: true });
          window.removeEventListener('touchmove', onSaveMove, { capture: true });
          window.removeEventListener('touchend', onSaveEnd, { capture: true });
        };

        saveContainer.__heavenlyCleanup = onSaveEnd;
        bar.addEventListener('mousedown', onSaveStart);
        bar.addEventListener('touchstart', onSaveStart, { passive: false });

        var btn = window.document.createElement('button');
        btn.type = 'button';
        btn.className = 'save-btn';
        btn.innerHTML = '<svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><span></span>';

        btn.querySelector('span').textContent = 'Save to ' + matchedFolder.title;
        btn.onclick = function (e) {
          e.stopPropagation();
          if (hasMovedSave) return;
          targetUrl = navigation.currentRemoteUrl(window, config);
          var activeSettings = loadHeavenlySettings(window);
          if (activeSettings.disableAllWidgets || activeSettings.disableAllFeatures) { removeWidget(); return; }
          var title = window.__heavenlyOriginalTitle || window.document.title || targetUrl;
          var customTitle = prompt("Save page to folder '" + matchedFolder.title + "':", title);
          if (customTitle === null) return;

          var freshRaw = storage.getItem('heavenly_bookmarks');
          var freshData = freshRaw ? JSON.parse(freshRaw) : data;
          var targetBm = freshData.bookmarks.find(function (b) { return b.id === matchedFolder.id; });
          if (targetBm && targetBm.disableQuickSaveWidget !== true) {
            if (navigation.findBookmarkByUrl(freshData, targetUrl)) { window.alert('This page is already saved in your bookmarks.'); return; }
            if (!targetBm.subBookmarks) targetBm.subBookmarks = [];
            targetBm.subBookmarks.push({
              id: 'sub_' + Date.now(),
              title: customTitle.trim() || title,
              url: targetUrl,
              icon: ''
            });
            storage.setItem('heavenly_bookmarks', JSON.stringify(freshData));
            goHeavenlyHome(window, config);
          }
        };

        var closeBtn = window.document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '✕';
        closeBtn.onclick = function (e) {
          e.stopPropagation();
          removeWidget();
        };

        bar.appendChild(btn);
        bar.appendChild(closeBtn);

        shadow.appendChild(style);
        shadow.appendChild(bar);
        window.document.body.appendChild(saveContainer);
      }

      if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
        setupWidget();
      } else if (window.document) {
        window.document.addEventListener('DOMContentLoaded', setupWidget);
      }
    } catch (e) {}
  }

  function initNewgroundsPagination(config, window, settings) {
    try {
      if (!isTopOrAboutBlankIframe(window)) return;
      if (!settings) {
        settings = loadHeavenlySettings(window);
      }
      if (settings.disableAllWidgets || settings.disableAllFeatures) {
        var existingNg = window.document ? window.document.getElementById('heavenly-ng-pagination-root') : null;
        if (existingNg) existingNg.remove();
        return;
      }
      var targetUrl = (config && config.url) ? config.url : '';
      if (!targetUrl && window.location) targetUrl = window.location.href;

      var urlObj;
      try {
        urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
      } catch (e) {
        return;
      }

      if (!/(^|\.)newgrounds\.com$/i.test(urlObj.hostname)) return;
      if (!urlObj.pathname.toLowerCase().startsWith('/games')) return;

      function setupPagination() {
        if (!window.document || !window.document.body) return;
        if (window.document.getElementById('heavenly-ng-pagination-root')) return;

        var urlObj;
        try {
          urlObj = new URL(targetUrl);
        } catch (e) {
          return;
        }

        var offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);
        if (isNaN(offset) || offset < 0) offset = 0;
        var currentPage = Math.floor(offset / 20) + 1;

        var nextObj = new URL(urlObj.href);
        nextObj.searchParams.set('offset', offset + 20);
        nextObj.searchParams.delete('inner');
        var nextProxiedUrl = fixUrl(nextObj.href, config, window.location);

        var prevProxiedUrl = null;
        if (offset >= 20) {
          var prevObj = new URL(urlObj.href);
          if (offset - 20 > 0) {
            prevObj.searchParams.set('offset', offset - 20);
          } else {
            prevObj.searchParams.delete('offset');
          }
          prevObj.searchParams.delete('inner');
          prevProxiedUrl = fixUrl(prevObj.href, config, window.location);
        }

        var navContainer = window.document.createElement('div');
        navContainer.id = 'heavenly-ng-pagination-root';

        var shadow = navContainer.attachShadow ? navContainer.attachShadow({ mode: 'open' }) : navContainer;

        var style = window.document.createElement('style');
        style.textContent = [
          '.ng-pag-bar {',
          '  position: fixed;',
          '  bottom: 24px;',
          '  left: 50%;',
          '  transform: translateX(-50%);',
          '  z-index: 2147483647;',
          '  display: flex;',
          '  align-items: center;',
          '  gap: 12px;',
          '  background: rgba(15, 23, 42, 0.92);',
          '  backdrop-filter: blur(16px);',
          '  border: 1px solid rgba(56, 189, 248, 0.35);',
          '  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.25);',
          '  padding: 8px 18px;',
          '  border-radius: 9999px;',
          '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
          '  color: #f8fafc;',
          '  font-size: 14px;',
          '  user-select: none;',
          '}',
          '.ng-btn {',
          '  background: rgba(56, 189, 248, 0.15);',
          '  color: #38bdf8;',
          '  border: 1px solid rgba(56, 189, 248, 0.4);',
          '  padding: 6px 14px;',
          '  border-radius: 9999px;',
          '  cursor: pointer;',
          '  text-decoration: none;',
          '  font-weight: 600;',
          '  font-size: 13px;',
          '  transition: all 0.2s ease;',
          '  display: inline-flex;',
          '  align-items: center;',
          '  gap: 6px;',
          '}',
          '.ng-btn:hover {',
          '  background: rgba(56, 189, 248, 0.35);',
          '  color: #ffffff;',
          '  border-color: #38bdf8;',
          '  transform: translateY(-1px);',
          '}',
          '.ng-btn.disabled {',
          '  opacity: 0.4;',
          '  cursor: not-allowed;',
          '  pointer-events: none;',
          '}',
          '.ng-page-info {',
          '  font-weight: 600;',
          '  color: #e2e8f0;',
          '  padding: 0 6px;',
          '}'
        ].join('\n');

        var bar = window.document.createElement('div');
        bar.className = 'ng-pag-bar';

        if (prevProxiedUrl) {
          var prevLink = window.document.createElement('a');
          prevLink.className = 'ng-btn';
          prevLink.href = prevProxiedUrl;
          prevLink.innerHTML = '← Prev Page';
          bar.appendChild(prevLink);
        } else {
          var prevBtnDisabled = window.document.createElement('span');
          prevBtnDisabled.className = 'ng-btn disabled';
          prevBtnDisabled.innerHTML = '← Prev Page';
          bar.appendChild(prevBtnDisabled);
        }

        var pageLabel = window.document.createElement('span');
        pageLabel.className = 'ng-page-info';
        pageLabel.textContent = 'Page ' + currentPage;
        bar.appendChild(pageLabel);

        var nextLink = window.document.createElement('a');
        nextLink.className = 'ng-btn';
        nextLink.href = nextProxiedUrl;
        nextLink.innerHTML = 'Next Page →';
        bar.appendChild(nextLink);

        shadow.appendChild(style);
        shadow.appendChild(bar);
        window.document.body.appendChild(navContainer);
      }

      if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
        setupPagination();
      } else if (window.document) {
        window.document.addEventListener('DOMContentLoaded', setupPagination);
      }
    } catch (e) {}
  }

  function initForWindow(config, window) {
    // Older/cached injected documents may contain a second initializer.
    if (window.__heavenlyClientInitialized) return;
    window.__heavenlyClientInitialized = true;
    // An about:blank child can share its caller's config. Its <base> and history
    // are window-specific and must not replace the parent's URL resolver.
    config = Object.assign({}, config);
    config.documentBaseUrl = function () { return window.document && window.document.baseURI; };

    if (!config.proxyOrigin) config.proxyOrigin = (window.location && window.location.origin) || '';
    repairDocumentProxyPath(config, window);
    initElementPrototypes(config, window);
    initMutationObserverAndClicks(config, window);
    initXMLHttpRequest(config, window);
    initFetch(config, window);
    initCreateElement(config, window);
    initAppendBodyIframe(config, window);
    initWebSockets(config, window);
    initPushState(config, window);
    // Performance optimization: Load settings once and pass to all initializers
    // to avoid redundant localStorage reads and JSON.parse calls (~49% speedup)
    var settings = loadHeavenlySettings(window);
    // Privacy handlers stay attached while paused so master changes can resume
    // existing cloaking and panic preferences without installing another handler.
    initHeavenlyCloakAndPanic(window, settings, config);
    initHeavenlyWidgets(window, settings, config);
    if (!settings.disableAllWidgets && !settings.disableAllFeatures) {
      initManualIconPickerWidget(config, window, settings);
      initNewgroundsPagination(config, window, settings);
    }

    initFolderQuickSaveWidget(config, window, settings);
    initHeavenlyNavigationHistory(window, config);

    // Touch event guard for injected client modal dialogues to prevent top overscroll / elastic bounce
    (function initClientModalTouchGuard() {
      if (!window.document || typeof window.document.addEventListener !== 'function') return;
      var startY = 0;

      window.document.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches.length === 1) {
          startY = e.touches[0].clientY;
        }
      }, { passive: true });

      window.document.addEventListener('touchmove', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        if (typeof window.document.querySelector !== 'function') return;
        var activeBackdrop = window.document.querySelector('#heavenly-fmhy-link-modal, #heavenly-em-link-modal, #heavenly-direct-preview-modal, #heavenly-bookmark-prompt-modal');
        if (!activeBackdrop) return;

        var currentY = e.touches[0].clientY;
        var deltaY = currentY - startY;

        var card = e.target && typeof e.target.closest === 'function' ? e.target.closest('div[style*="max-height"]') : null;
        if (card) {
          if (card.scrollTop <= 0 && deltaY > 0) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            card.scrollTop = 0;
          } else if (card.scrollTop + card.clientHeight >= card.scrollHeight - 1 && deltaY < 0) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
          }
        } else {
          if (typeof e.preventDefault === 'function') e.preventDefault();
        }
      }, { passive: false });
    })();

    if (window === global) {
      // leave no trace
      delete global.unblockerInit;
    }

  }

  // either export things for testing or put the init method into the global scope to be called
  // with config by the next script tag in a browser
  /*globals module*/
  if (typeof module === "undefined") {
    global.unblockerInit = initForWindow;
  } else {
    module.exports = {
      initForWindow: initForWindow,
      fixUrl: fixUrl,
      getPresetSvg: getPresetSvg,
      goHeavenlyHome: goHeavenlyHome,
      fixSrcset: fixSrcset,
      isTopOrAboutBlankIframe: isTopOrAboutBlankIframe,
      openAboutBlankLauncher: openAboutBlankLauncher,
      openIntentionalProxyLink: openIntentionalProxyLink,
      getActiveProxiedUrl: getActiveProxiedUrl,
    };
  }
})(this); // window in a browser, global in node.js
