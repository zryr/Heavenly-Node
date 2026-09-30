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
      var trimmed = candidate.replace(/^\s+|\s+$/g, "");
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

  function fixUrl(urlStr, config, location) {
    if (urlStr === null || urlStr === undefined) {
      return urlStr;
    }
    urlStr = urlStr.toString();

    var prefix = config.prefix;
    var prefixLen = prefix.length;

    // Early fast-path: check if URL is already proxied (root-relative)
    if (urlStr.substr(0, prefixLen) === prefix) {
      return urlStr;
    }

    // Early fast-path: non-HTTP/HTTPS schemes that should not be proxied
    // Avoids expensive new URL() parsing overhead for common data, script, or anchor URIs
    if (
      urlStr.substr(0, 11) === "javascript:" ||
      urlStr.substr(0, 5) === "data:" ||
      urlStr.substr(0, 6) === "about:" ||
      urlStr.substr(0, 5) === "blob:" ||
      urlStr.substr(0, 7) === "mailto:" ||
      urlStr.substr(0, 4) === "tel:"
    ) {
      return urlStr;
    }

    // Performance optimization: Fast-path check single-slash malformed URLs (e.g., https:/example.com)
    // avoids regex execution for standard absolute and relative URLs
    if (urlStr.indexOf(":/") !== -1 && urlStr.indexOf("://") === -1) {
      urlStr = urlStr.replace(/^(https?:\/)([^\/])/i, "$1/$2");
    }

    var isAbsoluteHttp =
      urlStr.substr(0, 7) === "http://" || urlStr.substr(0, 8) === "https://";

    var currentRemoteHref;
    function getCurrentRemoteHref() {
      if (currentRemoteHref !== undefined) return currentRemoteHref;
      if (location.pathname.substr(0, prefixLen) === prefix) {
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

    if (window.open) {
      var _winOpen = window.open;
      window.open = function (url) {
        var args = Array.prototype.slice.call(arguments);
        if (args[0]) {
          args[0] = fixUrl(args[0], config, window.location);
        }
        return _winOpen.apply(window, args);
      };
    }
  }

  function initMutationObserverAndClicks(config, window) {
    function processElementNode(el) {
      if (!el || el.nodeType !== 1) return;

      var tagName = el.tagName ? el.tagName.toLowerCase() : "";
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

    // Global capture-phase click and auxclick event listener to enforce proxied href on anchor clicks
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
    var presetTitles = [
      "Google Classroom",
      "My Drive - Google Drive",
      "Dashboard",
      "Dashboard | Khan Academy"
    ];
    if (settings && settings.customPresets) {
      for (var k in settings.customPresets) {
        if (settings.customPresets[k] && settings.customPresets[k].title) {
          presetTitles.push(settings.customPresets[k].title);
        }
      }
    }
    return presetTitles.indexOf(title) !== -1;
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
      touchPanic: saved.touchPanic || false,
      panicUrl: saved.panicUrl || 'https://classroom.google.com',
      showScrollLock: saved.showScrollLock !== undefined ? saved.showScrollLock : true,
      showMagnifier: saved.showMagnifier !== undefined ? saved.showMagnifier : true,
      showNavSearch: saved.showNavSearch !== undefined ? saved.showNavSearch : true,
      showNavHome: saved.showNavHome !== undefined ? saved.showNavHome : true,
      useWidgetDock: saved.useWidgetDock || false,
      dockPosition: saved.dockPosition || 'bottom',
      expandDirection: saved.expandDirection || 'left'
    };
  }

  function initHeavenlyCloakAndPanic(window, settings, config) {
    try {
      if (window !== window.top) return;

      var DEFAULT_PRESETS = {
        classroom: { title: "Google Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
        drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
        canvas: { title: "Dashboard", icon: "https://du1ux2871uqvu.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
        khan: { title: "Dashboard | Khan Academy", icon: "https://www.khanacademy.org/favicon.ico" }
      };

      if (!settings) {
        settings = loadHeavenlySettings(window);
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
            var savedPanicPos = localStorage.getItem('heavenly_panic_pos');
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

          // Long-press drag variables
          var holdTimer = null;
          var holdAnimFrame = null;
          var startTime = 0;
          var HOLD_DURATION = 1500; // 1.5 seconds
          var canDrag = false;
          var isDragging = false;
          var startX = 0, startY = 0;
          var startLeft = 0, startTop = 0;

          function triggerPanic() {
            window.location.href = settings.panicUrl || 'https://classroom.google.com';
          }

          function cancelHold() {
            if (holdTimer) clearTimeout(holdTimer);
            if (holdAnimFrame) cancelAnimationFrame(holdAnimFrame);
            holdTimer = null;
            holdAnimFrame = null;
            progSvg.classList.remove('active');
            progCircle.style.strokeDashoffset = '138';
          }

          function updateProgress() {
            var elapsed = Date.now() - startTime;
            var progress = Math.min(1, elapsed / HOLD_DURATION);
            var offset = 138 * (1 - progress);
            progCircle.style.strokeDashoffset = offset.toString();

            if (progress < 1) {
              holdAnimFrame = requestAnimationFrame(updateProgress);
            } else {
              canDrag = true;
              btn.classList.add('dragging');
              progSvg.classList.remove('active');
            }
          }

          var onDown = function (e) {
            canDrag = false;
            isDragging = false;
            startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

            var rect = pContainer.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            startTime = Date.now();
            progSvg.classList.add('active');
            updateProgress();

            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
            window.addEventListener('touchmove', onMove, true);
            window.addEventListener('touchend', onUp, true);
          };

          var onMove = function (e) {
            var currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            var currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            var dx = currentX - startX;
            var dy = currentY - startY;

            if (!canDrag) {
              if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                cancelHold();
              }
              return;
            }

            isDragging = true;
            pContainer.style.bottom = 'auto';
            pContainer.style.right = 'auto';

            var newLeft = startLeft + dx;
            var newTop = startTop + dy;

            var maxLeft = (window.innerWidth || 800) - pContainer.offsetWidth;
            var maxTop = (window.innerHeight || 600) - pContainer.offsetHeight;

            pContainer.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            pContainer.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
          };

          var onUp = function () {
            cancelHold();
            window.removeEventListener('mousemove', onMove, true);
            window.removeEventListener('mouseup', onUp, true);
            window.removeEventListener('touchmove', onMove, true);
            window.removeEventListener('touchend', onUp, true);

            if (canDrag && isDragging) {
              btn.classList.remove('dragging');
              try {
                var rect = pContainer.getBoundingClientRect();
                localStorage.setItem('heavenly_panic_pos', JSON.stringify({ left: rect.left, top: rect.top }));
              } catch (e) {}
            } else if (!isDragging) {
              // Tap/click triggers panic directly regardless of minimized circle state
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

  function initHeavenlyWidgets(window, settings) {
    try {
      if (window !== window.top) return; // Only show in main top window

      if (!settings) {
        settings = loadHeavenlySettings(window);
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

        // Clamp on initial load
        setTimeout(enforceBoundaries, 0);

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
          var expandedW = container.offsetWidth || 200;
          var rect = container.getBoundingClientRect();
          isMinimized = true;
          widgetElement.classList.add('minimized');

          var miniW = 38; // size of circle widget
          if (!isLeft) {
            // Right mode: circle appears on right side where close button was
            var newLeft = rect.left + (expandedW - miniW);
            container.style.left = newLeft + 'px';
          }
          enforceBoundaries();
        }

        function expand() {
          if (!isMinimized) return;
          var isLeft = updateWidgetMode();
          var miniW = container.offsetWidth || 38;
          var rect = container.getBoundingClientRect();
          isMinimized = false;
          widgetElement.classList.remove('minimized');

          if (!isLeft) {
            // Right mode: expand leftwards from right-side circle
            var expandedW = container.offsetWidth || 200;
            var newLeft = rect.left - (expandedW - miniW);
            container.style.left = newLeft + 'px';
          }
          enforceBoundaries();
          resetInactivityTimer();
        }

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
        var showNavSearch = settings.showNavSearch !== undefined ? settings.showNavSearch : true;
        var showNavHome = settings.showNavHome !== undefined ? settings.showNavHome : true;
        var useWidgetDock = settings.useWidgetDock || false;
        var dockPosition = settings.dockPosition || 'bottom';

        // --- COLLAPSIBLE WIDGET DOCK BAR MODE ---
        if (useWidgetDock) {
          // Remove floating widgets if present when dock is active
          ['heavenly-scroll-lock-root', 'heavenly-magnifier-root', 'heavenly-nav-root'].forEach(function (id) {
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
            '  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto;',
            '}',
            '.dock-bar {',
            '  background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);',
            '  border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 20px;',
            '  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.25);',
            '  padding: 10px 16px; display: flex; align-items: center; gap: 12px; color: #f8fafc;',
            '}',
            '.pull-tab {',
            '  background: linear-gradient(135deg, rgba(56, 189, 248, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%);',
            '  color: #030712; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 50%;',
            '  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;',
            '  cursor: pointer; box-shadow: 0 0 15px rgba(56, 189, 248, 0.6); outline: none;',
            '  font-size: 14px; font-weight: 700; transition: transform 0.3s ease, box-shadow 0.3s ease; flex-shrink: 0;',
            '}',
            '.pull-tab:hover { transform: scale(1.12); box-shadow: 0 0 22px rgba(56, 189, 248, 0.9); }',
            '/* Dock Positions */',
            '.dock-bottom { bottom: 12px; left: 50%; transform: translateX(-50%); flex-direction: column; }',
            '.dock-bottom.collapsed { transform: translate(-50%, calc(100% - 16px)); }',
            '.dock-bottom .pull-tab { margin-bottom: 6px; }',
            '.dock-top { top: 12px; left: 50%; transform: translateX(-50%); flex-direction: column-reverse; }',
            '.dock-top.collapsed { transform: translate(-50%, calc(-100% + 16px)); }',
            '.dock-top .pull-tab { margin-top: 6px; }',
            '.dock-left { left: 12px; top: 50%; transform: translateY(-50%); flex-direction: row-reverse; }',
            '.dock-left .dock-bar { flex-direction: column; }',
            '.dock-left.collapsed { transform: translate(calc(-100% + 16px), -50%); }',
            '.dock-left .pull-tab { margin-left: 6px; }',
            '.dock-right { right: 12px; top: 50%; transform: translateY(-50%); flex-direction: row; }',
            '.dock-right .dock-bar { flex-direction: column; }',
            '.dock-right.collapsed { transform: translate(calc(100% - 16px), -50%); }',
            '.dock-right .pull-tab { margin-right: 6px; }',
            '.dock-item { display: flex; align-items: center; gap: 8px; }',
            '.dock-divider { width: 1px; height: 24px; background: rgba(148, 163, 184, 0.2); }',
            '.dock-left .dock-divider, .dock-right .dock-divider { width: 24px; height: 1px; }'
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
            items.push('<button type="button" class="btn-ctrl" id="dock-home-btn" title="Go Home">🏠 Home</button>');
          }

          if (showNavSearch) {
            items.push('<div class="dock-item"><input type="text" class="nav-input" id="dock-search-input" placeholder="Search or URL..." /><button type="button" class="btn-ctrl" id="dock-go-btn">Go</button></div>');
          }

          if (showScrollLock) {
            items.push('<div class="dock-item"><span style="font-size:12px;font-weight:600;color:#e0f2fe;">Scroll Lock</span><button type="button" class="btn-toggle" id="dock-scroll-btn"><span>🔓 OFF</span></button></div>');
          }

          if (showMagnifier) {
            items.push('<div class="dock-item"><button type="button" class="btn-toggle" id="dock-mag-btn"><span>🔍 Mag OFF</span></button><button type="button" class="btn-ctrl" id="dock-zoom-out">-</button><span id="dock-zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">2.0x</span><button type="button" class="btn-ctrl" id="dock-zoom-in">+</button></div>');
          }

          dockBar.innerHTML = items.join('<div class="dock-divider"></div>');

          wrapper.appendChild(pullBtn);
          wrapper.appendChild(dockBar);
          dockShadow.appendChild(dockStyle);
          dockShadow.appendChild(wrapper);

          var targetParent = window.document.body || window.document.documentElement;
          if (targetParent) targetParent.appendChild(dockContainer);

          var isCollapsed = false;
          pullBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
              wrapper.classList.add('collapsed');
              pullBtn.querySelector('span').style.transform = 'rotate(180deg)';
            } else {
              wrapper.classList.remove('collapsed');
              pullBtn.querySelector('span').style.transform = 'rotate(0deg)';
            }
          });

          // Wire up Home button
          if (showNavHome) {
            var homeBtn = dockBar.querySelector('#dock-home-btn');
            if (homeBtn) homeBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              (window.top || window).location.href = 'https://heavenly-node.vercel.app/';
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

        // --- 2. MAGNIFIER WIDGET & LENS FRAME ---
        if (showMagnifier) {
          var magContainer = window.document.createElement('div');
          magContainer.id = 'heavenly-magnifier-root';
          magContainer.style.cssText = 'position:fixed;z-index:2147483646;user-select:none;-webkit-user-select:none;font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

          var magShadow = magContainer.attachShadow ? magContainer.attachShadow({ mode: 'open' }) : magContainer;

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
            '.resize-handle-se { bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: nwse-resize; }'
          ].join('\n');

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
            '  <span id="zoom-label" style="font-size:11px;font-weight:700;color:#38bdf8;">2.0x</span>',
            '  <button type="button" class="btn-ctrl" id="zoom-in-btn" title="Zoom In">+</button>',
            '  <button type="button" class="btn-ctrl" id="size-btn" title="Lens Size">Size</button>',
            '  <button type="button" class="btn-close-widget" title="Collapse Widget">✕</button>',
            '</div>'
          ].join('\n');

          magShadow.appendChild(magStyle);
          magShadow.appendChild(magWidget);
          window.document.body.appendChild(magContainer);

          attachWidgetBehaviors(magContainer, magWidget, 'heavenly_magnifier_pos', 70, 20);
        }

        // --- Magnifier Lens Frame Logic ---
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
          if (lensFrame) return;

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

          // Copy head stylesheets & inline styles into lens view so CSS rules apply inside Shadow DOM
          var baseEl = window.document.querySelector('base');
          if (baseEl) viewEl.appendChild(baseEl.cloneNode(true));

          var styleEls = window.document.querySelectorAll('style, link[rel="stylesheet"]');
          for (var sIdx = 0; sIdx < styleEls.length; sIdx++) {
            viewEl.appendChild(styleEls[sIdx].cloneNode(true));
          }

          // Mirror clone of document body
          var clone = window.document.body.cloneNode(true);
          // Remove heavenly roots from clone to avoid infinite duplication
          var roots = clone.querySelectorAll('#heavenly-scroll-lock-root, #heavenly-magnifier-root, #heavenly-nav-root, #heavenly-touch-panic-root, #heavenly-dock-root');
          for (var rIdx = 0; rIdx < roots.length; rIdx++) {
            var rootEl = roots[rIdx];
            if (rootEl.remove) rootEl.remove();
            else if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
          }

          // Copy canvas content if present
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

          // Close button inside header
          lensFrame.querySelector('#close-lens-btn').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMagnifier(false);
          });

          // Draggable header for lens frame
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

          // Resizing Handles Logic (Edges & Corners)
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

        function toggleMagnifier(enable) {
          magEnabled = enable !== undefined ? enable : !magEnabled;
          var btn = magShadow.querySelector('#mag-toggle-btn');
          if (magEnabled) {
            btn.classList.add('active');
            btn.innerHTML = '<span>🔍 ON</span>';
            createLensFrame();
          } else {
            btn.classList.remove('active');
            btn.innerHTML = '<span>🔍 OFF</span>';
            destroyLensFrame();
          }
        }

        magShadow.querySelector('#mag-toggle-btn').addEventListener('click', function (e) {
          e.stopPropagation();
          toggleMagnifier();
        });

        magShadow.querySelector('#zoom-in-btn').addEventListener('click', function (e) {
          e.stopPropagation();
          if (zoomLevel < 4.0) {
            zoomLevel = Math.round((zoomLevel + 0.5) * 10) / 10;
            magShadow.querySelector('#zoom-label').textContent = zoomLevel.toFixed(1) + 'x';
            if (lensFrame) {
              lensFrame.querySelector('#lens-header span').textContent = '🔍 Lens (' + zoomLevel.toFixed(1) + 'x)';
              updateMirrorPosition();
            }
          }
        });

        magShadow.querySelector('#zoom-out-btn').addEventListener('click', function (e) {
          e.stopPropagation();
          if (zoomLevel > 1.5) {
            zoomLevel = Math.round((zoomLevel - 0.5) * 10) / 10;
            magShadow.querySelector('#zoom-label').textContent = zoomLevel.toFixed(1) + 'x';
            if (lensFrame) {
              lensFrame.querySelector('#lens-header span').textContent = '🔍 Lens (' + zoomLevel.toFixed(1) + 'x)';
              updateMirrorPosition();
            }
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

        // Sync mirror on page scroll
        window.addEventListener('scroll', function () {
          if (magEnabled) updateMirrorPosition();
        }, { passive: true });

        // --- 3. NAVIGATION WIDGET (Search Bar & Home Button) ---
        if (showNavSearch || showNavHome) {
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

          if (showNavHome) {
            navHtml.push('<button type="button" class="btn-ctrl" id="nav-home-btn" title="Go to Homepage">🏠 Home</button>');
          }

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

  function initNewgroundsPagination(config, window) {
    try {
      if (window !== window.top) return;
      var targetUrl = (config && config.url) ? config.url : '';
      if (!targetUrl && window.location) targetUrl = window.location.href;

      if (!/(^|\.)newgrounds\.com/i.test(targetUrl)) return;

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
    console.log("begin unblocker client scripts", config, window);
    initElementPrototypes(config, window);
    initMutationObserverAndClicks(config, window);
    initXMLHttpRequest(config, window);
    initFetch(config, window);
    initCreateElement(config, window);
    initAppendBodyIframe(config, window);
    initWebSockets(config, window);
    initPushState(config, window);
    var settings = loadHeavenlySettings(window);
    initHeavenlyCloakAndPanic(window, settings, config);
    initHeavenlyWidgets(window, settings);
    initNewgroundsPagination(config, window);

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
