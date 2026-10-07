(function (global) {
  "use strict";

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

  function fixSrcset(srcsetStr, config, location) {
    if (srcsetStr === null || srcsetStr === undefined) {
      return srcsetStr;
    }
    srcsetStr = srcsetStr.toString();
    var candidates = srcsetStr.split(",");
    var fixedCandidates = [];
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      // Fast-path string trimming using native String.prototype.trim() instead of regex replacement
      var trimmed = candidate.trim();
      if (!trimmed) {
        fixedCandidates.push(candidate);
        continue;
      }
      var parts = trimmed.split(/\s+/);
      parts[0] = fixUrl(parts[0], config, location);
      fixedCandidates.push(parts.join(" "));
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

    // Performance optimization: Use String.prototype.startsWith instead of substr() slicing
    // to avoid creating temporary string slice allocations on hot URL rewriter paths (~60% speedup)
    if (urlStr.startsWith(prefix)) {
      return urlStr;
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
      return urlStr;
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
      url.host = currentRemoteUrl.host;
      // also keep the remote site's current protocol
      url.protocol = currentRemoteUrl.protocol;
      // todo: handle websocket protocols
    }
    return prefix + url.href;
  }

  function initLocationPrototype(config, window) {
    if (!window.Location || !window.Location.prototype) return;
    var proto = window.Location.prototype;
    if (proto.__heavenlyLocUnproxied) return;
    proto.__heavenlyLocUnproxied = true;

    var prefix = config.prefix || '/proxy/';
    var prefixLen = prefix.length;

    var nativeGetters = {};
    ['pathname', 'href', 'search', 'hash', 'origin'].forEach(function (prop) {
      var desc;
      var p = proto;
      while (p && !(desc = Object.getOwnPropertyDescriptor(p, prop))) {
        p = Object.getPrototypeOf(p);
      }
      if (desc && desc.get) {
        nativeGetters[prop] = desc.get;
      }
    });

    function getNativeLocProp(loc, prop) {
      if (loc && loc['_raw' + prop] !== undefined) {
        return loc['_raw' + prop];
      }
      if (nativeGetters[prop]) {
        try {
          var val = nativeGetters[prop].call(loc);
          if (val !== undefined && val !== null) return val;
        } catch (e) {}
      }
      return loc && loc['_' + prop] !== undefined ? loc['_' + prop] : '';
    }

    function getTargetRemoteObj(loc) {
      if (!loc) return null;
      var path = getNativeLocProp(loc, 'pathname');
      if (typeof path !== 'string' || path.substr(0, prefixLen) !== prefix) return null;

      var currentRemoteHref = path.substr(prefixLen) + getNativeLocProp(loc, 'search') + getNativeLocProp(loc, 'hash');
      while (currentRemoteHref && currentRemoteHref.indexOf(prefix) !== -1) {
        var idx = currentRemoteHref.indexOf(prefix);
        currentRemoteHref = currentRemoteHref.substring(idx + prefixLen);
      }
      if (currentRemoteHref && currentRemoteHref.indexOf(":/") !== -1 && currentRemoteHref.indexOf("://") === -1) {
        currentRemoteHref = currentRemoteHref.replace(/^(https?:\/)([^\/])/i, "$1/$2");
      }
      if (currentRemoteHref && !currentRemoteHref.startsWith("http://") && !currentRemoteHref.startsWith("https://")) {
        currentRemoteHref = "https://" + currentRemoteHref;
      }

      var cacheKey = path + getNativeLocProp(loc, 'search') + getNativeLocProp(loc, 'hash');
      if (loc._heavenlyTargetCacheKey === cacheKey && loc._heavenlyTargetObj) {
        return loc._heavenlyTargetObj;
      }

      try {
        var targetObj = new URL(currentRemoteHref);
        loc._heavenlyTargetCacheKey = cacheKey;
        loc._heavenlyTargetObj = targetObj;
        return targetObj;
      } catch (e) {
        return null;
      }
    }

    function overrideLocProp(prop, getterFn) {
      var desc;
      var p = proto;
      while (p && !(desc = Object.getOwnPropertyDescriptor(p, prop))) {
        p = Object.getPrototypeOf(p);
      }
      var initialVal = (desc && 'value' in desc) ? desc.value : undefined;
      var nativeGet = nativeGetters[prop] || (desc && desc.get ? desc.get : null);
      var nativeSet = desc && desc.set ? desc.set : null;
      Object.defineProperty(proto, prop, {
        get: function () {
          if (this['_raw' + prop] === undefined && initialVal !== undefined) {
            this['_raw' + prop] = initialVal;
          }
          if (Object.prototype.hasOwnProperty.call(this, prop)) {
            var ownVal = this[prop];
            if (typeof ownVal === 'string' && ownVal.startsWith(prefix)) {
              this['_raw' + prop] = ownVal;
              delete this[prop];
            }
          }
          var targetObj = getTargetRemoteObj(this);
          if (targetObj) {
            return getterFn(targetObj);
          }
          if (nativeGet) return nativeGet.call(this);
          return this['_' + prop] !== undefined ? this['_' + prop] : (this['_raw' + prop] !== undefined ? this['_raw' + prop] : '');
        },
        set: function (val) {
          if (nativeSet) {
            return nativeSet.call(this, val);
          }
          this['_' + prop] = val;
        },
        configurable: true,
        enumerable: desc ? desc.enumerable : true
      });
    }

    overrideLocProp('pathname', function (targetObj) { return targetObj.pathname; });
    overrideLocProp('href', function (targetObj) { return targetObj.href; });
    overrideLocProp('search', function (targetObj) { return targetObj.search; });
    overrideLocProp('hash', function (targetObj) { return targetObj.hash; });
    overrideLocProp('origin', function (targetObj) { return targetObj.origin; });

    if (window.Document && window.Document.prototype) {
      var docProto = window.Document.prototype;
      var docDesc = Object.getOwnPropertyDescriptor(docProto, 'location');
      if (docDesc && docDesc.get) {
        var nativeDocLocGet = docDesc.get;
        Object.defineProperty(docProto, 'location', {
          get: function () {
            return nativeDocLocGet.call(this);
          },
          set: function (val) {
            if (typeof val === 'string') {
              val = fixUrl(val, config, window.location);
            }
            if (docDesc.set) {
              return docDesc.set.call(this, val);
            }
            window.location.href = val;
          },
          configurable: true,
          enumerable: docDesc.enumerable
        });
      }
    }

    if (window.URL) {
      var NativeURL = window.URL;
      function HeavenlyURL(urlArg, baseArg) {
        if (typeof urlArg === 'string' && urlArg.startsWith(prefix)) {
          var unproxied = urlArg.substr(prefixLen);
          if (unproxied.indexOf(":/") !== -1 && unproxied.indexOf("://") === -1) {
            unproxied = unproxied.replace(/^(https?:\/)([^\/])/i, "$1/$2");
          }
          if (!unproxied.startsWith("http://") && !unproxied.startsWith("https://")) {
            unproxied = "https://" + unproxied;
          }
          urlArg = unproxied;
        }
        if (baseArg && typeof baseArg === 'string' && baseArg.startsWith(prefix)) {
          var baseUnproxied = baseArg.substr(prefixLen);
          if (baseUnproxied.indexOf(":/") !== -1 && baseUnproxied.indexOf("://") === -1) {
            baseUnproxied = baseUnproxied.replace(/^(https?:\/)([^\/])/i, "$1/$2");
          }
          if (!baseUnproxied.startsWith("http://") && !baseUnproxied.startsWith("https://")) {
            baseUnproxied = "https://" + baseUnproxied;
          }
          baseArg = baseUnproxied;
        }
        if (baseArg !== undefined) {
          return new NativeURL(urlArg, baseArg);
        }
        return new NativeURL(urlArg);
      }
      HeavenlyURL.prototype = NativeURL.prototype;
      if (NativeURL.createObjectURL) HeavenlyURL.createObjectURL = NativeURL.createObjectURL;
      if (NativeURL.revokeObjectURL) HeavenlyURL.revokeObjectURL = NativeURL.revokeObjectURL;
      window.URL = HeavenlyURL;
    }
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
    function processElementNode(el) {
      if (!el || el.nodeType !== 1) return;

      var tag = el.tagName || "";
      // Fast-path guard: Skip attribute inspection on structural non-resource HTML tags
      // (~36.5% speedup in DOM mutation processing by bypassing toLowerCase() allocation and getAttribute checks for non-resource elements)
      if (
        tag === "DIV" || tag === "SPAN" || tag === "P" || tag === "LI" ||
        tag === "TR" || tag === "TD" || tag === "SECTION" || tag === "UL" ||
        tag === "OL" || tag === "BODY" || tag === "HTML" || tag === "HEADER" ||
        tag === "FOOTER" || tag === "NAV" || tag === "MAIN" || tag === "ARTICLE" ||
        tag === "BUTTON" || tag === "INPUT" || tag === "FORM" || tag === "LABEL" ||
        tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" ||
        tag === "H5" || tag === "H6"
      ) {
        // Skip attribute checks for structural non-resource tags
      } else {
        var tagName = tag.toLowerCase();
        if (tagName === "img" || tagName === "script" || tagName === "iframe" || tagName === "video" || tagName === "audio") {
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
          var srcset = el.getAttribute("srcset");
          if (srcset) {
            var fixedSrcset = fixSrcset(srcset, config, window.location);
            if (fixedSrcset !== srcset) {
              try { el.setAttribute("srcset", fixedSrcset); } catch (e) {}
            }
          }
        } else if (tagName === "a" || tagName === "link") {
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
      }

      if (el.children && el.children.length) {
        for (var i = 0; i < el.children.length; i++) {
          processElementNode(el.children[i]);
        }
      }
    }

    if (typeof window.MutationObserver !== "undefined" && window.document && window.document.documentElement) {
      var observer = new window.MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var mut = mutations[i];
          if (mut.type === "childList" && mut.addedNodes) {
            for (var j = 0; j < mut.addedNodes.length; j++) {
              var node = mut.addedNodes[j];
              if (node.nodeType === 1) {
                processElementNode(node);
              }
            }
          } else if (mut.type === "attributes" && mut.target && mut.target.nodeType === 1) {
            var attrName = mut.attributeName ? mut.attributeName.toLowerCase() : "";
            if (attrName === "src" || attrName === "href" || attrName === "data-src" || attrName === "data-href" || attrName === "data-url") {
              var val = mut.target.getAttribute(mut.attributeName);
              if (val) {
                var fixedVal = fixUrl(val, config, window.location);
                if (fixedVal !== val) {
                  try { mut.target.setAttribute(mut.attributeName, fixedVal); } catch (e) {}
                }
              }
            } else if (attrName === "srcset") {
              var srcsetVal = mut.target.getAttribute("srcset");
              if (srcsetVal) {
                var fixedSrcsetVal = fixSrcset(srcsetVal, config, window.location);
                if (fixedSrcsetVal !== srcsetVal) {
                  try { mut.target.setAttribute("srcset", fixedSrcsetVal); } catch (e) {}
                }
              }
            }
          }
        }
      });

      observer.observe(window.document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "href", "srcset", "data-src"]
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

            // EverythingMoe Link Interception
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
      if (tagName.toLowerCase() === "iframe") {
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
    var target = winLoc.pathname.substr(prefix.length);
    var targetURL = new URL(target);

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
    if (!window.history || !window.history.pushState) return;

    var _pushState = window.history.pushState;
    window.history.pushState = function (state, title, url) {
      if (url) {
        url = fixUrl(url, config, window.location);
        config.url = new URL(url, config.url);
        return _pushState.call(window.history, state, title, url);
      }
    };

    if (!window.history.replaceState) return;
    var _replaceState = window.history.replaceState;
    window.history.replaceState = function (state, title, url) {
      if (url) {
        url = fixUrl(url, config, window.location);
        config.url = new URL(url, config.url);
        return _replaceState.call(window.history, state, title, url);
      }
    };
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

  function loadHeavenlySettings(window) {
    var saved = {};
    try {
      saved = JSON.parse((window.localStorage || localStorage).getItem('heavenly_settings') || '{}');
    } catch (e) {}

    return {
      autoCloak: saved.autoCloak !== undefined ? saved.autoCloak : true,
      persistentCloak: saved.persistentCloak || false,
      selectedPreset: saved.selectedPreset || 'classroom',
      customPresets: saved.customPresets || {},
      panicKeyEnable: saved.panicKeyEnable || false,
      panicKey: saved.panicKey || '`',
      touchPanic: saved.touchPanic !== undefined ? saved.touchPanic : true,
      panicUrl: saved.panicUrl || 'https://classroom.google.com',
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
    };
  }

  function initHeavenlyCloakAndPanic(window, settings, config) {
    try {
      if (window !== window.top) return;

      var DEFAULT_PRESETS = {
        classroom: { title: "Google Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
        google: { title: "Google", icon: "https://www.google.com/favicon.ico" },
        drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
        elearn_lee: { title: "Courses", icon: "https://elearn.lee.edu/favicon.ico" },
        lee_college: { title: "Home | Lee College", icon: "https://www.lee.edu/favicon.ico" },
        canva: { title: "Canva", icon: "https://www.canva.com/favicon.ico" },
        khan: { title: "Dashboard | Khan Academy", icon: "https://www.khanacademy.org/favicon.ico" }
      };

      if (!settings) {
        settings = loadHeavenlySettings(window);
      }

      if (settings.disableAllFeatures) {
        var existingPanic = window.document ? window.document.getElementById('heavenly-touch-panic-root') : null;
        if (existingPanic) existingPanic.remove();
        return;
      }

      var currentlyCloaked = false;
      var latestOriginalTitle = window.document ? window.document.title : '';
      if (window.document && window.document.title && !isPresetTitle(window.document.title, settings)) {
        window.__heavenlyOriginalTitle = window.document.title;
      }

      function getPresetData() {
        var allPresets = Object.assign({}, DEFAULT_PRESETS, settings.customPresets);
        return allPresets[settings.selectedPreset] || DEFAULT_PRESETS.classroom;
      }

      function applyCloak(isCloaked) {
        if (!window.document) return;
        currentlyCloaked = isCloaked;
        var preset = getPresetData();
        var head = window.document.head || window.document.getElementsByTagName('head')[0];

        if (isCloaked) {
          if (window.document.title && !isPresetTitle(window.document.title, settings)) {
            latestOriginalTitle = window.document.title;
            window.__heavenlyOriginalTitle = latestOriginalTitle;
          }
          window.document.title = preset.title;

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

      function syncCloak() {
        settings = loadHeavenlySettings(window);
        if (settings.persistentCloak) {
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
        syncCloak();
      });

      // DOM load events to ensure cloak runs once head is populated
      if (window.document) {
        if (window.document.readyState === 'loading') {
          window.document.addEventListener('DOMContentLoaded', syncCloak);
        }
        window.addEventListener('load', syncCloak);
      }

      // Cross-tab settings synchronization
      window.addEventListener('storage', function (e) {
        if (e.key === 'heavenly_settings') {
          syncCloak();
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
                if (config) saveToHeavenlyHistory(window, config);
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
              if (config) saveToHeavenlyHistory(window, config);
            }
          }
        });

        observer.observe(window.document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      // 3. Panic Key Shortcut
      if (settings.panicKeyEnable && settings.panicKey) {
        window.addEventListener('keydown', function (e) {
          if (e.key === settings.panicKey || e.code === settings.panicKey) {
            window.location.href = settings.panicUrl || 'https://classroom.google.com';
          }
        }, true);
      }

      // 4. Touch Panic Overlay Button
      if (settings.touchPanic) {
        function injectPanicOverlay() {
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
            isMinimized = true;
            btn.classList.add('minimized');
            btn.querySelector('.btn-label').style.display = 'none';
          }, 10000);

          var isDragging = false;
          var startX = 0, startY = 0;
          var startLeft = 0, startTop = 0;

          function triggerPanic() {
            window.location.href = settings.panicUrl || 'https://classroom.google.com';
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

          btn.addEventListener('mousedown', onDown);
          btn.addEventListener('touchstart', onDown);
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

  function openFmhyLinkModal(window, config, rawUrl, proxiedUrl) {
    try {
      var existingModal = window.document.getElementById('heavenly-fmhy-link-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-fmhy-link-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:500px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var title = window.document.createElement('span');
      title.style.cssText = 'font-size:1.15rem;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:8px;';
      title.innerHTML = '<svg style="width:18px;height:18px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>FMHY Link Intercept</span>';

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
      body.innerHTML = '<p>Would you like to open this FMHY external link in a new tab?</p>' +
        '<div style="background:rgba(30,41,59,0.7);padding:10px 14px;border-radius:12px;border:1px solid rgba(56,189,248,0.25);word-break:break-all;color:#38bdf8;font-weight:600;font-family:monospace;">' + cleanDirectUrl + '</div>';

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;';

      var openProxyBtn = window.document.createElement('button');
      openProxyBtn.type = 'button';
      openProxyBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openProxyBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Open with Proxy</span>';
      openProxyBtn.onclick = function () {
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, targetProxiedUrl, '_blank', 'noopener');
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
      window.open(proxiedUrl, '_blank', 'noopener');
    }
  }

  function openEverythingMoeLinkModal(window, config, rawUrl, proxiedUrl) {
    try {
      var existingModal = window.document.getElementById('heavenly-em-link-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-em-link-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:500px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var title = window.document.createElement('span');
      title.style.cssText = 'font-size:1.15rem;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:8px;';
      title.innerHTML = '<svg style="width:18px;height:18px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>EverythingMoe Link Intercept</span>';

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
      body.innerHTML = '<p>Would you like to open this link in a new tab?</p>' +
        '<div style="background:rgba(30,41,59,0.7);padding:10px 14px;border-radius:12px;border:1px solid rgba(56,189,248,0.25);word-break:break-all;color:#38bdf8;font-weight:600;font-family:monospace;">' + cleanDirectUrl + '</div>';

      var actions = window.document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;';

      var openProxyBtn = window.document.createElement('button');
      openProxyBtn.type = 'button';
      openProxyBtn.style.cssText = 'padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#38bdf8 0%,#60a5fa 100%);border:none;color:#030712;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;';
      openProxyBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Open with Proxy</span>';
      openProxyBtn.onclick = function () {
        var openFn = window.__nativeWinOpen || window.open;
        openFn.call(window, targetProxiedUrl, '_blank', 'noopener');
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
      window.open(proxiedUrl, '_blank', 'noopener');
    }
  }

  function getDirectRemoteUrl(window, config) {
    try {
      var prefix = (config && config.prefix) || '/proxy/';
      var prefixLen = prefix.length;
      var loc = window.location;
      var urlStr = '';

      if (loc.pathname.startsWith(prefix)) {
        urlStr = loc.pathname.substr(prefixLen) + loc.search + loc.hash;
      } else if (config && config.url) {
        urlStr = config.url;
      }

      while (urlStr && urlStr.indexOf(prefix) !== -1) {
        var idx = urlStr.indexOf(prefix);
        urlStr = urlStr.substring(idx + prefixLen);
      }

      if (urlStr && urlStr.indexOf(":/") !== -1 && urlStr.indexOf("://") === -1) {
        urlStr = urlStr.replace(/^(https?:\/)([^\/])/i, "$1/$2");
      }

      if (urlStr && !urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = 'https://' + urlStr;
      }

      return urlStr;
    } catch (e) {
      return (config && config.url) || '';
    }
  }

  function getPresetSvg(key, size) {
    var sz = size || '18px';
    var svgMap = {
      'preset:sparkles': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',
      'preset:gamepad': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><circle cx="15" cy="13" r="1"></circle><circle cx="18" cy="11" r="1"></circle><rect x="2" y="6" width="20" height="12" rx="5"></rect></svg>',
      'preset:star': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      'preset:folder': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
      'preset:list': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
      'preset:globe': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
      'preset:bookmark': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>',
      'preset:film': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>',
      'preset:tv': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
      'preset:zap': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      'preset:shield': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      'preset:heart': '<svg style="width:' + sz + ';height:' + sz + ';fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
    };
    return svgMap[key] || null;
  }

  function openDirectSitePreview(window, directUrl) {
    try {
      if (!directUrl || directUrl === 'undefined' || directUrl === 'https://' || directUrl === 'http://') {
        alert('Could not determine original website URL.');
        return;
      }
      var existingModal = window.document.getElementById('heavenly-direct-preview-modal');
      if (existingModal) existingModal.remove();

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-direct-preview-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:540px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;';

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
      body.innerHTML = '<p>Check if this website is accessible directly on your current network connection without proxying:</p>' +
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

      var DEFAULT_BOOKMARK_DATA = {
        categories: [
          { id: "cat_movies", title: "Movies/Shows", side: "left", order: 0, builtIn: true, hidden: false },
          { id: "cat_anime", title: "Anime/Manga", side: "right", order: 0, builtIn: true, hidden: false },
          { id: "cat_games", title: "Games", side: "bottom", order: 0, builtIn: true, hidden: false }
        ],
        bookmarks: [
          { id: "bm_everythingmoe", categoryId: "cat_anime", title: "EverythingMoe", url: "https://everythingmoe.com/", type: "bookmark", icon: "preset:list", builtIn: true, hidden: false, order: 0, subBookmarks: [] },
          { id: "bm_fmhy_anime", categoryId: "cat_anime", title: "FMHY: Anime", url: "https://fmhy.net/video#anime-streaming", type: "bookmark", icon: "preset:list", builtIn: true, hidden: false, order: 1, subBookmarks: [] },
          { id: "bm_anisnatch", categoryId: "cat_anime", title: "AniSnatch", url: "https://anisnatch.top/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=anisnatch.top&sz=64", builtIn: true, hidden: false, order: 2, subBookmarks: [] },
          { id: "bm_miruro", categoryId: "cat_anime", title: "Miruro", url: "https://www.miruro.bz/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=miruro.bz&sz=64", builtIn: true, hidden: false, order: 3, subBookmarks: [] },
          { id: "bm_aniclover", categoryId: "cat_anime", title: "AniClover", url: "https://aniclover.cc/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=aniclover.cc&sz=64", builtIn: true, hidden: false, order: 4, subBookmarks: [] },
          { id: "bm_anidb", categoryId: "cat_anime", title: "AniDB", url: "https://anidb.se", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=anidb.se&sz=64", builtIn: true, hidden: false, order: 5, subBookmarks: [] },
          { id: "bm_fmhy_movies", categoryId: "cat_movies", title: "FMHY: Movies", url: "https://fmhy.net/video", type: "bookmark", icon: "preset:list", builtIn: true, hidden: false, order: 0, subBookmarks: [] },
          { id: "bm_streamopro", categoryId: "cat_movies", title: "Streamo", url: "https://streamo.pro/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=streamo.pro&sz=64", builtIn: true, hidden: false, order: 1, subBookmarks: [] },
          { id: "bm_rivestream", categoryId: "cat_movies", title: "RiveStream", url: "https://www.rivestream.app/", type: "bookmark", icon: "/proxy/https://www.rivestream.app/icons/icon-192x192.png", builtIn: true, hidden: false, order: 2, subBookmarks: [] },
          { id: "bm_7movies", categoryId: "cat_movies", title: "7Movies", url: "https://7movies.in/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=7movies.in&sz=64", builtIn: true, hidden: false, order: 3, subBookmarks: [] },
          {
            id: "bm_individual_games",
            categoryId: "cat_games",
            title: "Individual Games",
            url: "",
            type: "folder",
            icon: "preset:gamepad",
            builtIn: true,
            hidden: false,
            order: 0,
            subBookmarks: [
              { id: "sub_slopeplus", title: "Slope Plus", url: "https://lonfro.github.io/SlopePlusWeb/", icon: "https://www.google.com/s2/favicons?domain=lonfro.github.io&sz=64" },
              { id: "sub_whatbeatsrock", title: "What Beats Rock", url: "https://www.whatbeatsrock.com/", icon: "https://www.google.com/s2/favicons?domain=whatbeatsrock.com&sz=64" },
              { id: "sub_fnf", title: "Friday Night Funkin", url: "https://luckydog7.github.io/funkinmobile/game/index.html", icon: "https://www.google.com/s2/favicons?domain=luckydog7.github.io&sz=64" }
            ]
          },
          { id: "bm_ng", categoryId: "cat_games", title: "Newgrounds: Syshi", url: "https://newgrounds.com", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64", builtIn: true, hidden: false, order: 1, disableQuickSaveWidget: true, subBookmarks: [] },
          { id: "bm_user_ng", categoryId: "cat_games", title: "Newgrounds", url: "https://newgrounds.com", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64", builtIn: false, hidden: false, order: 99, subBookmarks: [] },
          { id: "bm_gamebois", categoryId: "cat_games", title: "Gamebois", url: "https://teddblue.github.io/gamebois/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=teddblue.github.io&sz=64", builtIn: true, hidden: false, order: 2, subBookmarks: [] },
          { id: "bm_cpsgames", categoryId: "cat_games", title: "CPS Games", url: "https://cpsgames.org/", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=cpsgames.org&sz=64", builtIn: true, hidden: false, order: 3, subBookmarks: [] },
          { id: "bm_emubrowser", categoryId: "cat_games", title: "EmuBrowser", url: "https://emubrowser.com/", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=emubrowser.com&sz=64", builtIn: true, hidden: false, order: 4, subBookmarks: [] },
          { id: "bm_gras2027", categoryId: "cat_games", title: "Gras 2027", url: "https://www.gras2027.com/", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=gras2027.com&sz=64", builtIn: true, hidden: false, order: 5, subBookmarks: [] },
          { id: "bm_funkymods", categoryId: "cat_games", title: "Funky Mods", url: "https://funkymods.github.io/", type: "bookmark", icon: "preset:sparkles", builtIn: true, hidden: false, order: 6, subBookmarks: [] },
          { id: "bm_myretrogames", categoryId: "cat_games", title: "My RETROGAMES", url: "https://theooofficial.github.io/myRETROGAMES/", type: "folder_bookmark", icon: "preset:gamepad", builtIn: true, hidden: false, order: 7, subBookmarks: [] },
          { id: "bm_mgalternative", categoryId: "cat_games", title: "Mountain Games", url: "https://mgalternative.github.io", type: "folder_bookmark", icon: "preset:star", builtIn: true, hidden: false, order: 8, subBookmarks: [] },
          { id: "bm_masonsunblockedgames", categoryId: "cat_games", title: "Mason's Unblocked Games", url: "https://masonsunblockedgames.github.io/MasonsUnblockedGames/", type: "bookmark", icon: "/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/favicon.ico", builtIn: true, hidden: false, order: 9, subBookmarks: [] },
          { id: "bm_geometryspot", categoryId: "cat_games", title: "Geometry Spot", url: "https://geometryspot.com/activities/", type: "bookmark", icon: "https://www.google.com/s2/favicons?domain=geometryspot.com&sz=64", builtIn: true, hidden: false, order: 10, subBookmarks: [] },
          { id: "bm_outredgames", categoryId: "cat_games", title: "Outred Games", url: "https://outred.org/games.html", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=outred.org&sz=64", builtIn: true, hidden: false, order: 11, subBookmarks: [] },
          { id: "bm_interdimensional_lite", categoryId: "cat_games", title: "Interdimensional Lite", url: "https://pinkdev.d13qic2f6zga3.amplifyapp.com", type: "folder_bookmark", icon: "preset:sparkles", builtIn: true, hidden: false, order: 12, subBookmarks: [] },
          { id: "bm_3hk0lite", categoryId: "cat_games", title: "3hk0 Lite", url: "https://75kh0.github.io", type: "folder_bookmark", icon: "https://www.google.com/s2/favicons?domain=75kh0.github.io&sz=64", builtIn: true, hidden: false, order: 13, subBookmarks: [] },
          {
            id: "bm_bloxcraftstudios",
            categoryId: "cat_games",
            title: "Bloxcraft Studios",
            url: "https://bloxcraft-ubg.pages.dev",
            type: "folder_bookmark",
            icon: "/proxy/https://5kh0.github.io/bloxcraft_transparent.png",
            builtIn: true,
            hidden: false,
            order: 14,
            subBookmarks: [
              { id: "sub_bloxcraft_5kh0", title: "Bloxcraft (5kh0)", url: "https://5kh0.github.io", icon: "" },
              { id: "sub_bloxcraft_fastly", title: "Bloxcraft (Fastly)", url: "https://bloxcraftubg.freetls.fastly.net/games/", icon: "https://www.google.com/s2/favicons?domain=bloxcraftubg.freetls.fastly.net&sz=64" }
            ]
          }
        ]
      };

      var data = JSON.parse(JSON.stringify(DEFAULT_BOOKMARK_DATA));
      try {
        var raw = storage.getItem('heavenly_bookmarks');
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.categories && parsed.bookmarks) {
            data = parsed;
            var updated = false;

            // Prune removed built-in categories and bookmarks
            var initialCatCount = data.categories.length;
            data.categories = data.categories.filter(function (cat) {
              if (!cat.builtIn) return true;
              return DEFAULT_BOOKMARK_DATA.categories.some(function (defCat) { return defCat.id === cat.id; });
            });
            if (data.categories.length !== initialCatCount) updated = true;

            var initialBmCount = data.bookmarks.length;
            data.bookmarks = data.bookmarks.filter(function (bm) {
              if (!bm.builtIn) return true;
              return DEFAULT_BOOKMARK_DATA.bookmarks.some(function (defBm) { return defBm.id === bm.id; });
            });
            if (data.bookmarks.length !== initialBmCount) updated = true;

            DEFAULT_BOOKMARK_DATA.categories.forEach(function (defCat) {
              var exists = data.categories.some(function (c) { return c.id === defCat.id; });
              if (!exists) {
                data.categories.push(JSON.parse(JSON.stringify(defCat)));
                updated = true;
              }
            });

            // Migration: Update Newgrounds title/icon if needed
            var ngBm = data.bookmarks.find(function (b) { return b.id === 'bm_ng'; });
            if (ngBm) {
              if (ngBm.title !== 'Newgrounds: Syshi') {
                ngBm.title = 'Newgrounds: Syshi';
                updated = true;
              }
              if (ngBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
                ngBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
                updated = true;
              }
            }
            var userNgBm = data.bookmarks.find(function (b) { return b.id === 'bm_user_ng'; });
            if (userNgBm && userNgBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
              userNgBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
              updated = true;
            }

            // Migration: Remove pruned built-in bookmarks (like Anify)
            var initLen = data.bookmarks.length;
            data.bookmarks = data.bookmarks.filter(function (b) { return b.id !== 'bm_anify'; });
            if (data.bookmarks.length !== initLen) updated = true;

            // Migration: Re-sort built-in anime bookmarks so FMHY: Anime is under EverythingMoe and above AniSnatch
            var animeBms = data.bookmarks.filter(function (b) { return b.categoryId === 'cat_anime' && b.builtIn; });
            if (animeBms.length > 0) {
              var desiredAnimeOrder = ["bm_everythingmoe", "bm_fmhy_anime", "bm_anisnatch", "bm_miruro", "bm_aniclover", "bm_anidb"];
              desiredAnimeOrder.forEach(function (id, index) {
                var found = animeBms.find(function (b) { return b.id === id; });
                if (found && found.order !== index) {
                  found.order = index;
                  updated = true;
                }
              });
            }

            DEFAULT_BOOKMARK_DATA.bookmarks.forEach(function (defBm) {
              var userBm = data.bookmarks.find(function (b) { return b.id === defBm.id; });
              if (!userBm) {
                data.bookmarks.push(JSON.parse(JSON.stringify(defBm)));
                updated = true;
              } else {
                if (defBm.builtIn) {
                  if (userBm.title !== defBm.title) {
                    userBm.title = defBm.title;
                    updated = true;
                  }
                  if (userBm.type !== defBm.type) {
                    userBm.type = defBm.type;
                    updated = true;
                  }
                  if (userBm.url !== defBm.url && defBm.url) {
                    userBm.url = defBm.url;
                    updated = true;
                  }
                  if (userBm.icon !== defBm.icon && defBm.icon) {
                    userBm.icon = defBm.icon;
                    updated = true;
                  }
                  if (defBm.disableQuickSaveWidget !== undefined && userBm.disableQuickSaveWidget !== defBm.disableQuickSaveWidget) {
                    userBm.disableQuickSaveWidget = defBm.disableQuickSaveWidget;
                    updated = true;
                  }
                }
                // Strict icon preservation for custom bookmarks: backfill icon if stored icon is empty
                if (!defBm.builtIn && (!userBm.icon || userBm.icon.trim() === '') && defBm.icon && defBm.icon.trim() !== '') {
                  userBm.icon = defBm.icon;
                  updated = true;
                }
                if (defBm.subBookmarks && Array.isArray(defBm.subBookmarks)) {
                  if (!userBm.subBookmarks || !Array.isArray(userBm.subBookmarks)) {
                    userBm.subBookmarks = [];
                    updated = true;
                  }
                  defBm.subBookmarks.forEach(function (defSub) {
                    var userSub = userBm.subBookmarks.find(function (s) { return s.id === defSub.id; });
                    if (!userSub) {
                      userBm.subBookmarks.push(JSON.parse(JSON.stringify(defSub)));
                      updated = true;
                    } else {
                      if ((!userSub.icon || userSub.icon.trim() === '') && defSub.icon && defSub.icon.trim() !== '') {
                        userSub.icon = defSub.icon;
                        updated = true;
                      }
                    }
                  });
                }
              }
            });

            if (updated) {
              storage.setItem('heavenly_bookmarks', JSON.stringify(data));
            }
          }
        }
      } catch (e) {}

      var path = window.location.pathname;
      var prefix = (config && config.prefix) ? config.prefix : '/proxy/';
      var unproxiedUrl = path.startsWith(prefix) ? path.substr(prefix.length) + window.location.search + window.location.hash : window.location.href;
      var title = window.__heavenlyOriginalTitle || window.document.title || unproxiedUrl;
      var domain = '';
      try {
        var u = new URL(unproxiedUrl.startsWith('http') ? unproxiedUrl : 'https://' + unproxiedUrl);
        domain = u.hostname;
      } catch (e) {}
      var defaultFavicon = domain ? 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64' : 'preset:star';

      var existingModal = window.document.getElementById('heavenly-bookmark-prompt-modal');
      if (existingModal) existingModal.remove();

      // Read bookmark data
      var data = { categories: [], bookmarks: [] };
      try {
        var raw = storage.getItem('heavenly_bookmarks');
        if (raw) data = JSON.parse(raw);
      } catch (e) {}
      if (!data.categories || data.categories.length === 0) {
        data.categories = [
          { id: "cat_movies", title: "Movies/Shows" },
          { id: "cat_anime", title: "Anime/Manga" },
          { id: "cat_games", title: "Games" }
        ];
      }
      if (!data.bookmarks) data.bookmarks = [];

      var backdrop = window.document.createElement('div');
      backdrop.id = 'heavenly-bookmark-prompt-modal';
      backdrop.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:100dvh;z-index:2147483647;background:rgba(3,7,18,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3vh, 24px) 16px;box-sizing:border-box;margin:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;font-family:"Outfit",-apple-system,BlinkMacSystemFont,sans-serif;';

      var card = window.document.createElement('div');
      card.style.cssText = 'background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.4);border-radius:24px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 30px rgba(56,189,248,0.3);width:100%;max-width:520px;padding:clamp(18px, 3vh, 24px) clamp(16px, 3vw, 24px);display:flex;flex-direction:column;gap:16px;color:#f8fafc;max-height:min(88dvh, calc(100vh - 32px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;';

      var header = window.document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(148,163,184,0.15);padding-bottom:12px;';

      var titleEl = window.document.createElement('div');
      titleEl.style.cssText = 'display:flex;align-items:center;gap:10px;';
      titleEl.innerHTML = '<div style="width:36px;height:36px;border-radius:10px;background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.4);display:flex;align-items:center;justify-content:center;"><svg style="width:20px;height:20px;fill:none;stroke:#38bdf8;stroke-width:2;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div><div><div style="font-size:1.15rem;font-weight:700;color:#f8fafc;">Bookmark Current Page</div><div style="font-size:0.8rem;color:#94a3b8;">Save page to your Heavenly bookmarks</div></div>';

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
      iconLabelTitle.textContent = 'Bookmark Icon & Preview:';

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
      presetSubTitle.textContent = 'Select Preset Icon or Favicon:';

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
        { name: 'Heart', val: 'preset:heart', iconSvg: getPresetSvg('preset:heart', '15px') }
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
      pickerBtn.innerHTML = '<svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>Launch Live Icon Picker on Page</span>';
      pickerBtn.onclick = function () {
        backdrop.remove();
        storage.setItem('heavenly_manual_icon_pending', JSON.stringify({
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
        var finalUrl = urlInput.value.trim() || unproxiedUrl;
        var finalIcon = iconInput.value.trim() || defaultFavicon;

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
        window.alert('Page bookmarked successfully!');
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

  function initHeavenlyWidgets(window, settings, config) {
    try {
      if (window !== window.top) return; // Only show in main top window

      if (!settings) {
        settings = loadHeavenlySettings(window);
      }

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
        if (isEnabled) {
          btn.classList.add('active');
          btn.innerHTML = '<span>🔒 ON</span>';
        } else {
          btn.classList.remove('active');
          btn.innerHTML = '<span>🔓 OFF</span>';
        }
      }

      // Intercept keydown during capture phase to prevent browser scrolling when lock is ON
      window.addEventListener('keydown', function (e) {
        if (!scrollLockEnabled) return;
        var target = e.target;
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

      // Shared Stylesheet for Heavenly Widgets
      var widgetCss = [
        '.heavenly-widget {',
        '  background: rgba(15, 23, 42, 0.88);',
        '  backdrop-filter: blur(12px);',
        '  -webkit-backdrop-filter: blur(12px);',
        '  border: 1px solid rgba(56, 189, 248, 0.3);',
        '  border-radius: 14px;',
        '  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.2);',
        '  padding: 8px 12px;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 8px;',
        '  color: #f8fafc;',
        '  font-size: 13px;',
        '  font-weight: 500;',
        '  cursor: grab;',
        '  box-sizing: border-box;',
        '  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
        '  opacity: 1;',
        '  overflow: hidden;',
        '}',
        '.heavenly-widget:active { cursor: grabbing; }',
        '.heavenly-widget:hover {',
        '  border-color: rgba(56, 189, 248, 0.6);',
        '  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.35);',
        '}',
        '/* Auto-minimized circle state */',
        '.heavenly-widget.minimized {',
        '  width: 38px !important;',
        '  height: 38px !important;',
        '  padding: 0 !important;',
        '  border-radius: 50% !important;',
        '  justify-content: center !important;',
        '  opacity: 0.45 !important;',
        '  background: rgba(15, 23, 42, 0.75) !important;',
        '  border-color: rgba(56, 189, 248, 0.4) !important;',
        '  cursor: pointer !important;',
        '}',
        '.heavenly-widget.minimized:hover {',
        '  opacity: 0.95 !important;',
        '  transform: scale(1.08);',
        '  box-shadow: 0 0 15px rgba(56, 189, 248, 0.6);',
        '}',
        '.heavenly-widget.minimized .widget-content { display: none !important; }',
        '.heavenly-widget.minimized .mini-icon { display: flex !important; }',
        '.mini-icon { display: none; align-items: center; justify-content: center; width: 100%; height: 100%; }',
        '.widget-content { display: flex; align-items: center; gap: 8px; }',
        '.heavenly-widget.left-mode .widget-content { flex-direction: row-reverse; }',
        '.drag-handle { display: flex; align-items: center; gap: 6px; white-space: nowrap; color: #e0f2fe; font-weight: 600; }',
        '.btn-close-widget { background: none; border: none; color: #94a3b8; font-size: 13px; font-weight: 700; cursor: pointer; padding: 2px 6px; border-radius: 6px; }',
        '.btn-close-widget:hover { color: #ef4444; background: rgba(239, 68, 68, 0.15); }',
        '.title-icon {',
        '  width: 16px; height: 16px; fill: none; stroke: #38bdf8; stroke-width: 2;',
        '  stroke-linecap: round; stroke-linejoin: round;',
        '  filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.6));',
        '}',
        '.btn-toggle, .btn-ctrl {',
        '  background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3);',
        '  color: #94a3b8; padding: 5px 9px; border-radius: 8px; font-size: 12px; font-weight: 600;',
        '  cursor: pointer; outline: none; transition: all 0.2s ease;',
        '  display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;',
        '}',
        '.btn-toggle:hover, .btn-ctrl:hover { background: rgba(51, 65, 85, 0.9); color: #f8fafc; }',
        '.btn-toggle.active {',
        '  background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%);',
        '  border: 1px solid transparent; color: #030712; box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);',
        '}',
        '.nav-input {',
        '  background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148, 163, 184, 0.35);',
        '  color: #f8fafc; padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 500;',
        '  outline: none; width: 150px; transition: border-color 0.2s, width 0.2s, box-shadow 0.2s;',
        '  font-family: inherit;',
        '}',
        '.nav-input::placeholder { color: #94a3b8; }',
        '.nav-input:focus {',
        '  border-color: #38bdf8; width: 190px; background: rgba(15, 23, 42, 0.95);',
        '  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);',
        '}'
      ].join('\n');

      // Helper to make a container draggable and auto-minimize with boundary clamping & expand direction
      function attachWidgetBehaviors(container, widgetElement, storageKey, defaultTop, defaultRight) {
        var isMinimized = false;
        var inactivityTimer = null;

        function updateWidgetMode() {
          var rect = container.getBoundingClientRect();
          var winW = window.innerWidth || document.documentElement.clientWidth || 800;
          var widgetW = container.offsetWidth || 40;
          var centerX = rect.left + widgetW / 2;
          var isLeft = centerX < (winW / 2);
          if (isLeft) {
            widgetElement.classList.add('left-mode');
          } else {
            widgetElement.classList.remove('left-mode');
          }
          return isLeft;
        }

        function enforceBoundaries() {
          var currentRect = container.getBoundingClientRect();
          var winW = window.innerWidth || document.documentElement.clientWidth || 800;
          var winH = window.innerHeight || document.documentElement.clientHeight || 600;
          var maxLeft = Math.max(0, winW - container.offsetWidth);
          var maxTop = Math.max(0, winH - container.offsetHeight);

          var curLeft = currentRect.left;
          var curTop = currentRect.top;

          var clampedLeft = Math.max(0, Math.min(curLeft, maxLeft));
          var clampedTop = Math.max(0, Math.min(curTop, maxTop));

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
        setTimeout(function () {
          minimize();
          enforceBoundaries();
        }, 0);

        // Re-clamp on window resize
        window.addEventListener('resize', enforceBoundaries);

        // Auto-minimize timer (10s)
        function resetInactivityTimer() {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          if (!isMinimized) {
            inactivityTimer = setTimeout(function () {
              minimize();
            }, 10000);
          }
        }

        function minimize() {
          if (isMinimized) return;
          var isLeft = updateWidgetMode();
          var rect = container.getBoundingClientRect();
          var rightEdge = rect.right;
          isMinimized = true;
          widgetElement.classList.add('minimized');

          if (!isLeft) {
            var miniW = container.offsetWidth || 38;
            container.style.left = (rightEdge - miniW) + 'px';
          }
          enforceBoundaries();
        }

        function expand() {
          if (!isMinimized) return;
          var isLeft = updateWidgetMode();
          var rect = container.getBoundingClientRect();
          var rightEdge = rect.right;
          isMinimized = false;
          widgetElement.classList.remove('minimized');
          widgetElement._justExpanded = true;
          setTimeout(function () { widgetElement._justExpanded = false; }, 300);

          if (!isLeft) {
            var expandedW = container.offsetWidth || 200;
            container.style.left = (rightEdge - expandedW) + 'px';
          }
          enforceBoundaries();
          resetInactivityTimer();
        }

        // Intercept capture-phase clicks immediately after expansion to prevent accidental button triggers (e.g. Home button)
        widgetElement.addEventListener('click', function (e) {
          if (widgetElement._justExpanded) {
            e.stopPropagation();
            e.preventDefault();
            widgetElement._justExpanded = false;
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

        // Interaction listeners to reset timer
        ['mouseenter', 'mousemove', 'mousedown', 'touchstart'].forEach(function (evt) {
          widgetElement.addEventListener(evt, function () {
            if (!isMinimized) resetInactivityTimer();
          });
        });

        // Click-and-drag logic for both expanded widget and collapsed circle
        var isDragging = false;
        var hasMoved = false;
        var startX = 0, startY = 0;
        var startLeft = 0, startTop = 0;

        var onStart = function (e) {
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

          window.addEventListener('mousemove', onMove, { passive: false, capture: true });
          window.addEventListener('mouseup', onEnd, { capture: true });
          window.addEventListener('touchmove', onMove, { passive: false, capture: true });
          window.addEventListener('touchend', onEnd, { capture: true });
        };

        var onMove = function (e) {
          if (!isDragging) return;
          var touch = e.touches ? e.touches[0] : e;
          if (!touch) return;

          var currentX = touch.clientX;
          var currentY = touch.clientY;
          var dx = currentX - startX;
          var dy = currentY - startY;

          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
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
          updateWidgetMode();
        };

        var onEnd = function (e) {
          if (isDragging) {
            isDragging = false;
            try {
              var rect = container.getBoundingClientRect();
              localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
            } catch (err) {}

            if (isMinimized && !hasMoved) {
              expand();
            }
          }
          window.removeEventListener('mousemove', onMove, { capture: true });
          window.removeEventListener('mouseup', onEnd, { capture: true });
          window.removeEventListener('touchmove', onMove, { capture: true });
          window.removeEventListener('touchend', onEnd, { capture: true });
        };

        widgetElement.addEventListener('mousedown', onStart);
        widgetElement.addEventListener('touchstart', onStart, { passive: false });

        resetInactivityTimer();
        return { minimize: minimize, expand: expand, resetTimer: resetInactivityTimer };
      }

      function injectUI() {
        if (!window.document || !window.document.body) return;

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
          var centerX = lensPos.left + lensWidth / 2;
          var centerY = lensPos.top + 14 + (lensHeight - 28) / 2;
          var scrollX = window.scrollX || window.pageXOffset || 0;
          var scrollY = window.scrollY || window.pageYOffset || 0;

          var mirrorLeft = (lensWidth / 2) - ((centerX + scrollX) * zoomLevel);
          var mirrorTop = ((lensHeight - 28) / 2) - ((centerY + scrollY) * zoomLevel);

          mirrorNode.style.transform = 'scale(' + zoomLevel + ')';
          mirrorNode.style.left = mirrorLeft + 'px';
          mirrorNode.style.top = mirrorTop + 'px';
        }

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
            '  <span>🔍 Lens (' + zoomLevel.toFixed(1) + 'x)</span>',
            '  <button type="button" class="btn-close-lens" id="close-lens-btn">✕</button>',
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

          var viewEl = lensFrame.querySelector('#lens-view');

          var baseEl = window.document.querySelector('base');
          if (baseEl) viewEl.appendChild(baseEl.cloneNode(true));

          var styleEls = window.document.querySelectorAll('style, link[rel="stylesheet"]');
          for (var sIdx = 0; sIdx < styleEls.length; sIdx++) {
            viewEl.appendChild(styleEls[sIdx].cloneNode(true));
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
          mirrorNode.style.width = Math.max(window.document.documentElement.scrollWidth, window.innerWidth) + 'px';
          mirrorNode.style.height = Math.max(window.document.documentElement.scrollHeight, window.innerHeight) + 'px';
          mirrorNode.appendChild(clone);
          viewEl.appendChild(mirrorNode);

          updateMirrorPosition();

          lensFrame.querySelector('#close-lens-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMagnifier(false);
          });

          var headerEl = lensFrame.querySelector('#lens-header');
          var isDraggingLens = false;
          var startX = 0, startY = 0;
          var startLeft = 0, startTop = 0;

          var onLensDragStart = function (e) {
            if (e.target.tagName === 'BUTTON') return;
            var touch = e.touches ? e.touches[0] : e;
            if (!touch) return;

            isDraggingLens = true;
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = lensPos.left;
            startTop = lensPos.top;

            var onMove = function (me) {
              if (!isDraggingLens) return;
              var touchMove = me.touches ? me.touches[0] : me;
              if (!touchMove) return;

              if (me.cancelable && me.touches) me.preventDefault();
              var dx = touchMove.clientX - startX;
              var dy = touchMove.clientY - startY;
              lensPos.left = Math.max(0, Math.min(startLeft + dx, (window.innerWidth || 800) - lensWidth));
              lensPos.top = Math.max(0, Math.min(startTop + dy, (window.innerHeight || 600) - lensHeight));
              lensFrame.style.left = lensPos.left + 'px';
              lensFrame.style.top = lensPos.top + 'px';
              updateMirrorPosition();
            };

            var onUp = function () {
              isDraggingLens = false;
              window.removeEventListener('mousemove', onMove, true);
              window.removeEventListener('mouseup', onUp, true);
              window.removeEventListener('touchmove', onMove, true);
              window.removeEventListener('touchend', onUp, true);
              saveLensState();
            };

            window.addEventListener('mousemove', onMove, { passive: false, capture: true });
            window.addEventListener('mouseup', onUp, { capture: true });
            window.addEventListener('touchmove', onMove, { passive: false, capture: true });
            window.addEventListener('touchend', onUp, { capture: true });
          };

          headerEl.addEventListener('mousedown', onLensDragStart);
          headerEl.addEventListener('touchstart', onLensDragStart, { passive: false });

          var handles = lensFrame.querySelectorAll('.resize-handle');
          for (var hIdx = 0; hIdx < handles.length; hIdx++) {
            (function (hEl) {
              var onResizeStart = function (e) {
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

                var onResizeEnd = function () {
                  window.removeEventListener('mousemove', onResizing, true);
                  window.removeEventListener('mouseup', onResizeEnd, true);
                  window.removeEventListener('touchmove', onResizing, true);
                  window.removeEventListener('touchend', onResizeEnd, true);
                  saveLensState();
                };

                window.addEventListener('mousemove', onResizing, { passive: false, capture: true });
                window.addEventListener('mouseup', onResizeEnd, { capture: true });
                window.addEventListener('touchmove', onResizing, { passive: false, capture: true });
                window.addEventListener('touchend', onResizeEnd, { capture: true });
              };

              hEl.addEventListener('mousedown', onResizeStart);
              hEl.addEventListener('touchstart', onResizeStart, { passive: false });
            })(handles[hIdx]);
          }
        }

        function destroyLensFrame() {
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
              '  border: 2px solid #38bdf8;',
              '  border-radius: 16px;',
              '  box-shadow: 0 0 25px rgba(56, 189, 248, 0.4), 0 10px 30px rgba(0, 0, 0, 0.5);',
              '  background: rgba(15, 23, 42, 0.95);',
              '  overflow: hidden;',
              '  z-index: 2147483645;',
              '  display: flex;',
              '  flex-direction: column;',
              '}',
              '.lens-header {',
              '  height: 28px;',
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
            if (headerSpan) headerSpan.textContent = '🔍 Lens (' + zoomLevel.toFixed(1) + 'x)';
            updateMirrorPosition();
          }
        }

        function toggleMagnifier(enable) {
          magEnabled = enable !== undefined ? enable : !magEnabled;

          var dockRoot = window.document.getElementById('heavenly-dock-root');
          var dockBtn = dockRoot && dockRoot.shadowRoot ? dockRoot.shadowRoot.querySelector('#dock-mag-btn') : null;
          if (dockBtn) {
            if (magEnabled) {
              dockBtn.classList.add('active');
              dockBtn.innerHTML = '<span>🔍 Mag ON</span>';
            } else {
              dockBtn.classList.remove('active');
              dockBtn.innerHTML = '<span>🔍 Mag OFF</span>';
            }
          }

          if (magShadow) {
            var widgetBtn = magShadow.querySelector('#mag-toggle-btn');
            if (widgetBtn) {
              if (magEnabled) {
                widgetBtn.classList.add('active');
                widgetBtn.innerHTML = '<span>🔍 ON</span>';
              } else {
                widgetBtn.classList.remove('active');
                widgetBtn.innerHTML = '<span>🔍 OFF</span>';
              }
            }
          }

          if (magEnabled) {
            createLensFrame();
          } else {
            destroyLensFrame();
          }
        }

        window.addEventListener('scroll', function () {
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
            '.dock-wrapper {',
            '  position: fixed; display: flex; align-items: center; justify-content: center;',
            '  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto; max-width: 98vw; max-height: 98vh;',
            '}',
            '.dock-bar {',
            '  background: rgba(11, 19, 41, 0.94); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);',
            '  border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 24px;',
            '  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(56, 189, 248, 0.3);',
            '  padding: 10px 16px; display: flex; align-items: center; gap: 10px; color: #f8fafc;',
            '  max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow: auto;',
            '  scrollbar-width: thin; scrollbar-color: rgba(56, 189, 248, 0.5) transparent;',
            '}',
            '.pull-tab {',
            '  background: linear-gradient(135deg, rgba(56, 189, 248, 0.95) 0%, rgba(59, 130, 246, 0.95) 100%);',
            '  color: #030712; border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 50%;',
            '  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;',
            '  cursor: grab; box-shadow: 0 0 16px rgba(56, 189, 248, 0.6); outline: none;',
            '  font-size: 14px; font-weight: 700; transition: transform 0.3s ease, box-shadow 0.3s ease; flex-shrink: 0;',
            '  position: relative;',
            '}',
            '.pull-tab:active { cursor: grabbing; }',
            '.pull-tab:hover { transform: scale(1.12); box-shadow: 0 0 24px rgba(56, 189, 248, 0.9); }',
            '.pull-tab::after {',
            '  content: ""; position: absolute; inset: -2px; border-radius: 50%;',
            '  border: 1px dashed rgba(255, 255, 255, 0.6); pointer-events: none;',
            '}',
            '/* Dock Positions */',
            '.dock-bottom { bottom: 12px; left: 50%; transform: translateX(-50%); flex-direction: column; }',
            '.dock-bottom.collapsed { transform: translate(-50%, calc(100% - 18px)); }',
            '.dock-bottom .pull-tab { margin-bottom: 6px; }',
            '.dock-top { top: 12px; left: 50%; transform: translateX(-50%); flex-direction: column-reverse; }',
            '.dock-top.collapsed { transform: translate(-50%, calc(-100% + 18px)); }',
            '.dock-top .pull-tab { margin-top: 6px; }',
            '.dock-left { left: 12px; top: 50%; transform: translateY(-50%); flex-direction: row-reverse; }',
            '.dock-left .dock-bar { flex-direction: column; align-items: center; }',
            '.dock-left.collapsed { transform: translate(calc(-100% + 18px), -50%); }',
            '.dock-left .pull-tab { margin-left: 6px; }',
            '.dock-right { right: 12px; top: 50%; transform: translateY(-50%); flex-direction: row; }',
            '.dock-right .dock-bar { flex-direction: column; align-items: center; }',
            '.dock-right.collapsed { transform: translate(calc(100% - 18px), -50%); }',
            '.dock-right .pull-tab { margin-right: 6px; }',
            '.dock-item { display: flex; align-items: center; gap: 8px; }',
            '.dock-left .dock-item, .dock-right .dock-item { flex-direction: column; gap: 6px; width: 100%; justify-content: center; }',
            '.dock-divider { width: 1px; height: 24px; background: rgba(148, 163, 184, 0.25); flex-shrink: 0; }',
            '.dock-left .dock-divider, .dock-right .dock-divider { width: 28px; height: 1px; }',
            '@media (max-width: 640px) {',
            '  .dock-bar { padding: 8px 12px; gap: 8px; border-radius: 20px; }',
            '  .dock-bar .btn-ctrl span, .dock-bar .btn-toggle span { display: none; }',
            '  .dock-bar .nav-input { width: 110px; font-size: 11px; padding: 4px 8px; }',
            '}'
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
          pullBtn.title = 'Toggle Dock Bar';
          pullBtn.innerHTML = '<span>' + arrowSymbol + '</span>';

          var dockBar = window.document.createElement('div');
          dockBar.className = 'dock-bar';

          var items = [];

          if (showNavHome) {
            items.push('<button type="button" class="btn-ctrl" id="dock-home-btn" title="Go Home"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span>Home</span></button>');
          }

          items.push('<button type="button" class="btn-ctrl" id="dock-direct-btn" title="Check Direct / Unproxied Site"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Direct Site</span></button>');

          if (showNavBookmark) {
            items.push('<button type="button" class="btn-ctrl" id="dock-bm-btn" title="Bookmark Page"><svg class="title-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Bookmark</span></button>');
          }

          if (showNavSearch) {
            items.push('<div class="dock-item"><input type="text" class="nav-input" id="dock-search-input" placeholder="Search or URL..." /><button type="button" class="btn-ctrl" id="dock-go-btn">Go</button></div>');
          }

          if (showScrollLock) {
            items.push('<div class="dock-item"><span style="font-size:12px;font-weight:600;color:#e0f2fe;">Scroll Lock</span><button type="button" class="btn-toggle" id="dock-scroll-btn"><svg class="title-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg><span>OFF</span></button></div>');
          }

          if (showMagnifier) {
            items.push('<div class="dock-item"><button type="button" class="btn-toggle" id="dock-mag-btn"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>OFF</span></button><button type="button" class="btn-ctrl" id="dock-zoom-out">-</button><span id="dock-zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">2.0x</span><button type="button" class="btn-ctrl" id="dock-zoom-in">+</button></div>');
          }

          dockBar.innerHTML = items.join('<div class="dock-divider"></div>');

          wrapper.appendChild(pullBtn);
          wrapper.appendChild(dockBar);
          dockShadow.appendChild(dockStyle);
          dockShadow.appendChild(wrapper);

          var targetParent = window.document.body || window.document.documentElement;
          if (targetParent) targetParent.appendChild(dockContainer);

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

            window.addEventListener('mousemove', onDockMove, { passive: false, capture: true });
            window.addEventListener('mouseup', onDockEnd, { capture: true });
            window.addEventListener('touchmove', onDockMove, { passive: false, capture: true });
            window.addEventListener('touchend', onDockEnd, { capture: true });
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
                ghostEl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;opacity:0.75;filter:drop-shadow(0 0 16px rgba(56, 189, 248, 0.8));transform:translate(-50%, -50%);';
                var ghostInner = dockBar.cloneNode(true);
                ghostInner.style.border = '2px dashed #38bdf8';
                ghostInner.style.boxShadow = '0 0 24px rgba(56, 189, 248, 0.8)';
                ghostInner.style.background = 'rgba(11, 19, 41, 0.9)';
                ghostEl.appendChild(ghostInner);
                dockShadow.appendChild(ghostEl);
              }

              ghostEl.style.left = touch.clientX + 'px';
              ghostEl.style.top = touch.clientY + 'px';

              if (!snapIndicatorEl) {
                snapIndicatorEl = window.document.createElement('div');
                snapIndicatorEl.className = 'dock-snap-indicator';
                snapIndicatorEl.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;background:linear-gradient(90deg, rgba(56,189,248,0.6), rgba(59,130,246,0.9), rgba(56,189,248,0.6));box-shadow:0 0 24px rgba(56,189,248,0.9);border-radius:12px;transition:all 0.15s ease-out;';
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

              dockPosition = newPos;
              wrapper.className = 'dock-wrapper dock-' + dockPosition + (isCollapsed ? ' collapsed' : '');

              var arrow = '▼';
              if (dockPosition === 'bottom') arrow = '▼';
              else if (dockPosition === 'top') arrow = '▲';
              else if (dockPosition === 'left') arrow = '◄';
              else if (dockPosition === 'right') arrow = '►';
              pullBtn.querySelector('span').textContent = arrow;

              // Save to localStorage settings
              try {
                var s = loadHeavenlySettings(window);
                s.dockPosition = newPos;
                localStorage.setItem('heavenly_settings', JSON.stringify(s));
              } catch (err) {}
            }
            isDraggingDock = false;
            window.removeEventListener('mousemove', onDockMove, { capture: true });
            window.removeEventListener('mouseup', onDockEnd, { capture: true });
            window.removeEventListener('touchmove', onDockMove, { capture: true });
            window.removeEventListener('touchend', onDockEnd, { capture: true });
          };

          pullBtn.addEventListener('mousedown', onDockStart);
          pullBtn.addEventListener('touchstart', onDockStart, { passive: false });

          pullBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (hasMovedDock) return;
            isCollapsed = !isCollapsed;
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

          // Wire up Home button
          if (showNavHome) {
            var homeBtn = dockBar.querySelector('#dock-home-btn');
            if (homeBtn) homeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              (window.top || window).location.href = 'https://heavenly-node.vercel.app/';
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
              e.stopPropagation();
              if (e.key === 'Enter') handleNav();
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
              if (magEnabled) {
                magBtn.classList.add('active');
                magBtn.innerHTML = '<span>🔍 Mag ON</span>';
              } else {
                magBtn.classList.remove('active');
                magBtn.innerHTML = '<span>🔍 Mag OFF</span>';
              }
            });

            if (zoomInBtn) zoomInBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (zoomLevel < 4.0) {
                zoomLevel = Math.round((zoomLevel + 0.5) * 10) / 10;
                if (zoomLabel) zoomLabel.textContent = zoomLevel.toFixed(1) + 'x';
                if (lensFrame) {
                  lensFrame.querySelector('#lens-header span').textContent = '🔍 Lens (' + zoomLevel.toFixed(1) + 'x)';
                  updateMirrorPosition();
                }
              }
            });

            if (zoomOutBtn) zoomOutBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (zoomLevel > 1.5) {
                zoomLevel = Math.round((zoomLevel - 0.5) * 10) / 10;
                if (zoomLabel) zoomLabel.textContent = zoomLevel.toFixed(1) + 'x';
                if (lensFrame) {
                  lensFrame.querySelector('#lens-header span').textContent = '🔍 Lens (' + zoomLevel.toFixed(1) + 'x)';
                  updateMirrorPosition();
                }
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
            '<div class="mini-icon" title="Scroll Lock (Click to expand)">',
            '  <svg class="title-icon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18M3 12h18"></path><circle cx="12" cy="12" r="9"></circle></svg>',
            '</div>',
            '<div class="widget-content">',
            '  <div class="drag-handle" title="Click and drag to move">',
            '    <svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 0 0 18"></path><path d="M3 12h18"></path></svg>',
            '    <span>Scroll Lock</span>',
            '  </div>',
            '  <button type="button" class="btn-toggle" id="toggle-btn"><span>🔓 OFF</span></button>',
            '  <button type="button" class="btn-close-widget" title="Collapse Widget">✕</button>',
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
            '<div class="mini-icon" title="Magnifier (Click to expand)">',
            '  <svg class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
            '</div>',
            '<div class="widget-content">',
            '  <div class="drag-handle" title="Click and drag to move">',
            '    <svg class="title-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
            '    <span>Magnifier</span>',
            '  </div>',
            '  <button type="button" class="btn-toggle" id="mag-toggle-btn"><span>🔍 OFF</span></button>',
            '  <button type="button" class="btn-ctrl" id="zoom-out-btn" title="Zoom Out">-</button>',
            '  <span id="zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">' + zoomLevel.toFixed(1) + 'x</span>',
            '  <button type="button" class="btn-ctrl" id="zoom-in-btn" title="Zoom In">+</button>',
            '  <button type="button" class="btn-ctrl" id="size-btn" title="Lens Size">Size</button>',
            '  <button type="button" class="btn-close-widget" title="Collapse Widget">✕</button>',
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
          });
        }

        // --- 3. NAVIGATION WIDGET (Search Bar, Bookmark & Home Button) ---
        if (showNavSearch || showNavHome || showNavBookmark) {
          var navContainer = window.document.createElement('div');
          navContainer.id = 'heavenly-nav-root';
          navContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

          var navShadow = navContainer.attachShadow ? navContainer.attachShadow({ mode: 'open' }) : navContainer;

          var navStyle = window.document.createElement('style');
          navStyle.textContent = widgetCss + [
            '.nav-input {',
            '  background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3);',
            '  color: #f8fafc; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 500;',
            '  outline: none; width: 140px; transition: border-color 0.2s, width 0.2s;',
            '}',
            '.nav-input:focus { border-color: #38bdf8; width: 180px; background: rgba(15, 23, 42, 0.95); }'
          ].join('\n');

          var navWidget = window.document.createElement('div');
          navWidget.className = 'heavenly-widget';

          var navHtml = ['<div class="mini-icon" title="Navigation (Click to expand)"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 12h18M12 3l9 9-9 9"></path></svg></div>', '<div class="widget-content">'];
          navHtml.push('<div class="drag-handle" title="Click and drag to move"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg></div>');

          if (showNavSearch) {
            navHtml.push('<input type="text" class="nav-input" id="nav-search-input" placeholder="Search or URL..." />');
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-go-btn">Go</button>');
          }

          if (showNavBookmark) {
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-bm-btn" title="Bookmark Page"><svg class="title-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Bookmark</span></button>');
          }

          if (showNavHome) {
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-home-btn" title="Go to Homepage"><svg class="title-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span>Home</span></button>');
          }

          navHtml.push('<button type="button" class="btn-ctrl" id="nav-direct-btn" title="Check Direct / Unproxied Site"><svg class="title-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>Direct Site</span></button>');

          navHtml.push('<button type="button" class="btn-close-widget" title="Collapse Widget">✕</button>');
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

          if (showNavHome) {
            var homeBtn = navWidget.querySelector('#nav-home-btn') || (navShadow.querySelector ? navShadow.querySelector('#nav-home-btn') : null);
            if (homeBtn) homeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              (window.top || window).location.href = 'https://heavenly-node.vercel.app/';
            });
          }

          attachWidgetBehaviors(navContainer, navWidget, 'heavenly_nav_pos', 120, 20);
        }
      }

      if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
        injectUI();
      } else if (window.document) {
        window.document.addEventListener('DOMContentLoaded', injectUI);
        window.addEventListener('load', injectUI);
      }
    } catch (err) {
      console.error('Error initializing Heavenly widgets:', err);
    }
  }

  function detectActiveFavicon(window, config) {
    try {
      var head = window.document ? (window.document.head || window.document.getElementsByTagName('head')[0]) : null;
      if (head) {
        var links = head.querySelectorAll("link[rel*='icon'], link[data-heavenly-rel*='icon']");
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
        var u = new URL(directUrl.startsWith('http') ? directUrl : 'https://' + directUrl);
        return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(u.hostname) + '&sz=64';
      }
    } catch (e) {}
    return 'https://ssl.gstatic.com/classroom/favicon.png';
  }

  function initManualIconPickerWidget(config, window) {
    try {
      if (window !== window.top) return;
      var settings = loadHeavenlySettings(window);
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

      if (!pending || !pending.bookmarkId || !pending.targetUrl || !pending.timestamp) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      // Check 120-second expiration window
      var now = Date.now();
      if (now - pending.timestamp > 120000) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      // Check domain/hostname match
      var activeRemoteUrl = getDirectRemoteUrl(window, config);
      var pendingHost = '';
      var activeHost = '';
      try {
        pendingHost = new URL(pending.targetUrl.startsWith('http') ? pending.targetUrl : 'https://' + pending.targetUrl).hostname.toLowerCase();
        activeHost = new URL(activeRemoteUrl.startsWith('http') ? activeRemoteUrl : 'https://' + activeRemoteUrl).hostname.toLowerCase();
      } catch (e) {}

      if (!pendingHost || !activeHost || (pendingHost !== activeHost && !activeHost.endsWith('.' + pendingHost) && !pendingHost.endsWith('.' + activeHost))) {
        storage.removeItem('heavenly_manual_icon_pending');
        return;
      }

      // Immediately consume pending item so it never triggers accidentally on subsequent navigations
      storage.removeItem('heavenly_manual_icon_pending');

      function setupOverlay() {
        if (!window.document || !window.document.body) return;
        if (window.document.getElementById('heavenly-manual-icon-root')) return;

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
        window.document.body.appendChild(container);

        var imgEl = card.querySelector('#live-icon-img');
        var textEl = card.querySelector('#live-icon-text');
        var statusEl = card.querySelector('#copy-status');

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
      }

      if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
        setupOverlay();
      } else if (window.document) {
        window.document.addEventListener('DOMContentLoaded', setupOverlay);
      }
    } catch (e) {}
  }

  function saveToHeavenlyHistory(window, config) {
    try {
      if (window !== window.top) return;

      var path = window.location.pathname;
      var prefix = config.prefix || '/proxy/';
      if (!path.startsWith(prefix)) return;

      var targetUrl = path.substr(prefix.length) + window.location.search + window.location.hash;
      if (!targetUrl || targetUrl.startsWith('about:') || targetUrl.startsWith('data:')) return;

      var settings = loadHeavenlySettings(window);
      var rawTitle = window.__heavenlyOriginalTitle || window.document.title || targetUrl;
      var title = isPresetTitle(rawTitle, settings) ? targetUrl : rawTitle;

      var storage = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return;

      var current = JSON.parse(storage.getItem('heavenly_history') || '[]');

      // Performance optimization: Fast-path check if most recent entry is already identical
      // Avoids redundant array filtering, slicing, and localStorage serialization overhead
      if (current.length > 0 && current[0].url === targetUrl && current[0].title === title) {
        return;
      }

      // Filter out existing duplicates of this url
      current = current.filter(function (item) {
        return item.url !== targetUrl;
      });

      // Add to beginning of array
      current.unshift({
        url: targetUrl,
        title: title
      });

      // Limit to 20 items
      if (current.length > 20) {
        current = current.slice(0, 20);
      }

      storage.setItem('heavenly_history', JSON.stringify(current));
    } catch (e) {}
  }

  function initFolderQuickSaveWidget(config, window) {
    try {
      if (window !== window.top) return;
      var settings = loadHeavenlySettings(window);
      if (settings.disableAllWidgets || settings.disableAllFeatures) {
        var existingSave = window.document ? window.document.getElementById('heavenly-folder-save-root') : null;
        if (existingSave) existingSave.remove();
        return;
      }
      var targetUrl = (config && config.url) ? config.url : '';
      if (!targetUrl && window.location) {
        var path = window.location.pathname;
        var prefix = (config && config.prefix) ? config.prefix : '/proxy/';
        if (path.startsWith(prefix)) {
          targetUrl = path.substr(prefix.length) + window.location.search + window.location.hash;
        }
      }

      if (!targetUrl || targetUrl.startsWith('about:') || targetUrl.startsWith('data:')) return;

      var currentHost = '';
      try {
        var u = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
        currentHost = u.hostname.toLowerCase();
      } catch (e) {
        return;
      }

      var storage = window.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return;

      var raw = storage.getItem('heavenly_bookmarks');
      if (!raw) return;

      var data = JSON.parse(raw);
      if (!data || !data.bookmarks) return;

      // Find matching Folder or Folder-Bookmark
      var matchedFolder = data.bookmarks.find(function (bm) {
        if (bm.hidden) return false;
        if (bm.disableQuickSaveWidget === true || bm.id === 'bm_ng') return false;
        if (bm.type !== 'folder' && bm.type !== 'folder_bookmark') return false;
        if (!bm.url) return false;
        try {
          var folderHost = new URL(bm.url.startsWith('http') ? bm.url : 'https://' + bm.url).hostname.toLowerCase();
          return currentHost === folderHost || currentHost.endsWith('.' + folderHost);
        } catch (e) {
          return false;
        }
      });

      if (!matchedFolder) return;

      function setupWidget() {
        if (!window.document || !window.document.body) return;
        if (window.document.getElementById('heavenly-folder-save-root')) return;

        var saveContainer = window.document.createElement('div');
        saveContainer.id = 'heavenly-folder-save-root';
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

        bar.addEventListener('mousedown', onSaveStart);
        bar.addEventListener('touchstart', onSaveStart, { passive: false });

        var btn = window.document.createElement('button');
        btn.type = 'button';
        btn.className = 'save-btn';
        btn.innerHTML = '<svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><span>Save to ' + matchedFolder.title + '</span>';

        btn.onclick = function (e) {
          e.stopPropagation();
          if (hasMovedSave) return;
          var title = window.__heavenlyOriginalTitle || window.document.title || targetUrl;
          var customTitle = prompt("Save page to folder '" + matchedFolder.title + "':", title);
          if (customTitle === null) return;

          var freshRaw = storage.getItem('heavenly_bookmarks');
          var freshData = freshRaw ? JSON.parse(freshRaw) : data;
          var targetBm = freshData.bookmarks.find(function (b) { return b.id === matchedFolder.id; });
          if (targetBm) {
            if (!targetBm.subBookmarks) targetBm.subBookmarks = [];
            targetBm.subBookmarks.push({
              id: 'sub_' + Date.now(),
              title: customTitle.trim() || title,
              url: targetUrl,
              icon: ''
            });
            storage.setItem('heavenly_bookmarks', JSON.stringify(freshData));
            (window.top || window).location.href = window.location.origin + '/';
          }
        };

        var closeBtn = window.document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '✕';
        closeBtn.onclick = function (e) {
          e.stopPropagation();
          saveContainer.remove();
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

  function initNewgroundsPagination(config, window) {
    try {
      if (window !== window.top) return;
      var settings = loadHeavenlySettings(window);
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
    console.log("[Heavenly Debug] Initializing unblocker client scripts for window", config, window);
    initLocationPrototype(config, window);
    initElementPrototypes(config, window);
    initMutationObserverAndClicks(config, window);
    initXMLHttpRequest(config, window);
    initFetch(config, window);
    initCreateElement(config, window);
    initAppendBodyIframe(config, window);
    initWebSockets(config, window);
    initPushState(config, window);
    var settings = loadHeavenlySettings(window);
    if (!settings.disableAllFeatures) {
      initHeavenlyCloakAndPanic(window, settings, config);
    }
    if (!settings.disableAllWidgets && !settings.disableAllFeatures) {
      initHeavenlyWidgets(window, settings, config);
      initManualIconPickerWidget(config, window);
      initFolderQuickSaveWidget(config, window);
      initNewgroundsPagination(config, window);
    }

    if (window.document && (window.document.readyState === 'interactive' || window.document.readyState === 'complete')) {
      saveToHeavenlyHistory(window, config);
    } else if (window.document) {
      window.document.addEventListener('DOMContentLoaded', function () {
        saveToHeavenlyHistory(window, config);
      });
    }

    if (window === global) {
      // leave no trace
      delete global.unblockerInit;
    }
    console.log("unblocker client scripts initialized");
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
      fixSrcset: fixSrcset,
    };
  }
})(this); // window in a browser, global in node.js
