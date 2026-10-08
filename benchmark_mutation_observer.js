const { performance } = require('perf_hooks');

// Mock Node structure for DOM mutation benchmarking
function createNode(tagName, attrs = {}, children = []) {
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    attributes: { ...attrs },
    getAttribute: function (name) {
      return this.attributes[name] || null;
    },
    setAttribute: function (name, val) {
      this.attributes[name] = val;
    },
    children: children
  };
}

function createTextNode() {
  return { nodeType: 3 };
}

// Config and location mock
const config = { prefix: '/proxy/', url: 'https://example.com/' };
const location = { origin: 'http://localhost', hostname: 'localhost', pathname: '/proxy/https://example.com/', search: '', hash: '' };

function fixUrl(url) {
  if (!url) return url;
  if (url.startsWith('/proxy/')) return url;
  return '/proxy/' + url;
}

function fixSrcset(srcset) {
  return srcset;
}

// Current processElementNode implementation in unblocker-client.js
function processElementNodeUnoptimized(el) {
  if (!el || el.nodeType !== 1) return;

  var tag = el.tagName || "";
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
        var fixedSrc = fixUrl(src);
        if (fixedSrc !== src) {
          try { el.setAttribute("src", fixedSrc); } catch (e) {}
        }
      }
      var dataSrc = el.getAttribute("data-src");
      if (dataSrc) {
        var fixedDataSrc = fixUrl(dataSrc);
        if (fixedDataSrc !== dataSrc) {
          try { el.setAttribute("data-src", fixedDataSrc); } catch (e) {}
        }
      }
      var dataUrl = el.getAttribute("data-url");
      if (dataUrl) {
        var fixedDataUrl = fixUrl(dataUrl);
        if (fixedDataUrl !== dataUrl) {
          try { el.setAttribute("data-url", fixedDataUrl); } catch (e) {}
        }
      }
      var srcset = el.getAttribute("srcset");
      if (srcset) {
        var fixedSrcset = fixSrcset(srcset);
        if (fixedSrcset !== srcset) {
          try { el.setAttribute("srcset", fixedSrcset); } catch (e) {}
        }
      }
    } else if (tagName === "a" || tagName === "link") {
      var href = el.getAttribute("href");
      if (href) {
        var fixedHref = fixUrl(href);
        if (fixedHref !== href) {
          try { el.setAttribute("href", fixedHref); } catch (e) {}
        }
      }
      var dataHref = el.getAttribute("data-href");
      if (dataHref) {
        var fixedDataHref = fixUrl(dataHref);
        if (fixedDataHref !== dataHref) {
          try { el.setAttribute("data-href", fixedDataHref); } catch (e) {}
        }
      }
      var dataUrl2 = el.getAttribute("data-url");
      if (dataUrl2) {
        var fixedDataUrl2 = fixUrl(dataUrl2);
        if (fixedDataUrl2 !== dataUrl2) {
          try { el.setAttribute("data-url", fixedDataUrl2); } catch (e) {}
        }
      }
    }
  }

  if (el.children && el.children.length) {
    for (var i = 0; i < el.children.length; i++) {
      processElementNodeUnoptimized(el.children[i]);
    }
  }
}

function handleMutationsUnoptimized(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var mut = mutations[i];
    if (mut.type === "childList" && mut.addedNodes) {
      for (var j = 0; j < mut.addedNodes.length; j++) {
        var node = mut.addedNodes[j];
        if (node.nodeType === 1) {
          processElementNodeUnoptimized(node);
        }
      }
    } else if (mut.type === "attributes" && mut.target && mut.target.nodeType === 1) {
      var attrName = mut.attributeName ? mut.attributeName.toLowerCase() : "";
      if (attrName === "src" || attrName === "href" || attrName === "data-src" || attrName === "data-href" || attrName === "data-url") {
        var val = mut.target.getAttribute(mut.attributeName);
        if (val) {
          var fixedVal = fixUrl(val);
          if (fixedVal !== val) {
            try { mut.target.setAttribute(mut.attributeName, fixedVal); } catch (e) {}
          }
        }
      } else if (attrName === "srcset") {
        var srcsetVal = mut.target.getAttribute("srcset");
        if (srcsetVal) {
          var fixedSrcsetVal = fixSrcset(srcsetVal);
          if (fixedSrcsetVal !== srcsetVal) {
            try { mut.target.setAttribute("srcset", fixedSrcsetVal); } catch (e) {}
          }
        }
      }
    }
  }
}

// Optimized processElementNode and MutationObserver loop
function processElementNodeOptimized(el) {
  if (!el || el.nodeType !== 1) return;

  var tag = el.tagName || "";
  if (tag === "IMG" || tag === "SCRIPT" || tag === "IFRAME" || tag === "VIDEO" || tag === "AUDIO") {
    var src = el.getAttribute("src");
    if (src) {
      var fixedSrc = fixUrl(src);
      if (fixedSrc !== src) {
        try { el.setAttribute("src", fixedSrc); } catch (e) {}
      }
    }
    var dataSrc = el.getAttribute("data-src");
    if (dataSrc) {
      var fixedDataSrc = fixUrl(dataSrc);
      if (fixedDataSrc !== dataSrc) {
        try { el.setAttribute("data-src", fixedDataSrc); } catch (e) {}
      }
    }
    var dataUrl = el.getAttribute("data-url");
    if (dataUrl) {
      var fixedDataUrl = fixUrl(dataUrl);
      if (fixedDataUrl !== dataUrl) {
        try { el.setAttribute("data-url", fixedDataUrl); } catch (e) {}
      }
    }
    var srcset = el.getAttribute("srcset");
    if (srcset) {
      var fixedSrcset = fixSrcset(srcset);
      if (fixedSrcset !== srcset) {
        try { el.setAttribute("srcset", fixedSrcset); } catch (e) {}
      }
    }
  } else if (tag === "A" || tag === "LINK") {
    var href = el.getAttribute("href");
    if (href) {
      var fixedHref = fixUrl(href);
      if (fixedHref !== href) {
        try { el.setAttribute("href", fixedHref); } catch (e) {}
      }
    }
    var dataHref = el.getAttribute("data-href");
    if (dataHref) {
      var fixedDataHref = fixUrl(dataHref);
      if (fixedDataHref !== dataHref) {
        try { el.setAttribute("data-href", fixedDataHref); } catch (e) {}
      }
    }
    var dataUrl2 = el.getAttribute("data-url");
    if (dataUrl2) {
      var fixedDataUrl2 = fixUrl(dataUrl2);
      if (fixedDataUrl2 !== dataUrl2) {
        try { el.setAttribute("data-url", fixedDataUrl2); } catch (e) {}
      }
    }
  }

  var children = el.children;
  if (children) {
    var cLen = children.length;
    for (var i = 0; i < cLen; i++) {
      processElementNodeOptimized(children[i]);
    }
  }
}

function handleMutationsOptimized(mutations) {
  var mLen = mutations.length;
  for (var i = 0; i < mLen; i++) {
    var mut = mutations[i];
    if (mut.type === "childList") {
      var added = mut.addedNodes;
      if (added) {
        var aLen = added.length;
        for (var j = 0; j < aLen; j++) {
          var node = added[j];
          if (node.nodeType === 1) {
            processElementNodeOptimized(node);
          }
        }
      }
    } else if (mut.type === "attributes") {
      var target = mut.target;
      if (!target || target.nodeType !== 1) continue;
      var attrName = mut.attributeName;
      if (!attrName) continue;

      if (attrName === "src" || attrName === "href" || attrName === "data-src" || attrName === "data-href" || attrName === "data-url" ||
          attrName === "SRC" || attrName === "HREF" || attrName === "DATA-SRC" || attrName === "DATA-HREF" || attrName === "DATA-URL") {
        var val = target.getAttribute(attrName);
        if (val) {
          var fixedVal = fixUrl(val);
          if (fixedVal !== val) {
            try { target.setAttribute(attrName, fixedVal); } catch (e) {}
          }
        }
      } else if (attrName === "srcset" || attrName === "SRCSET") {
        var srcsetVal = target.getAttribute(attrName);
        if (srcsetVal) {
          var fixedSrcsetVal = fixSrcset(srcsetVal);
          if (fixedSrcsetVal !== srcsetVal) {
            try { target.setAttribute(attrName, fixedSrcsetVal); } catch (e) {}
          }
        }
      }
    }
  }
}

// Generate realistic DOM mutation test cases
function generateMutationBatch() {
  const mutations = [];

  // Batch 1: childList mutation with nested DOM trees (e.g. dynamic page elements)
  const tree1 = createNode('DIV', { class: 'container' }, [
    createNode('SPAN', {}, [createTextNode()]),
    createNode('P', {}, [
      createTextNode(),
      createNode('A', { href: 'https://example.com/page1' }),
      createNode('IMG', { src: 'https://example.com/image.png' })
    ]),
    createNode('ARTICLE', {}, [
      createNode('H2', {}),
      createNode('SECTION', {}, [
        createNode('IFRAME', { src: 'https://example.com/frame' })
      ])
    ])
  ]);

  const tree2 = createNode('SECTION', {}, [
    createNode('DIV', { class: 'card' }, [
      createNode('IMG', { src: '/proxy/https://example.com/already_proxied.png' }),
      createNode('BUTTON', { class: 'btn' }),
      createNode('A', { href: '/proxy/https://example.com/already_proxied' })
    ])
  ]);

  mutations.push({
    type: 'childList',
    addedNodes: [createTextNode(), tree1, createTextNode(), tree2]
  });

  // Batch 2: attribute mutations
  const imgNode = createNode('IMG', { src: 'https://example.com/new.png' });
  const aNode = createNode('A', { href: 'https://example.com/link' });
  const divNode = createNode('DIV', { class: 'active' });

  mutations.push({ type: 'attributes', target: imgNode, attributeName: 'src' });
  mutations.push({ type: 'attributes', target: aNode, attributeName: 'href' });
  mutations.push({ type: 'attributes', target: divNode, attributeName: 'class' });

  return mutations;
}

const ITERATIONS = 300000;

// Warmup
for (let i = 0; i < 10000; i++) {
  handleMutationsUnoptimized(generateMutationBatch());
  handleMutationsOptimized(generateMutationBatch());
}

// Benchmark Unoptimized
const startUnopt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  handleMutationsUnoptimized(generateMutationBatch());
}
const timeUnopt = performance.now() - startUnopt;

// Benchmark Optimized
const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  handleMutationsOptimized(generateMutationBatch());
}
const timeOpt = performance.now() - startOpt;

const opsUnopt = (ITERATIONS / (timeUnopt / 1000)).toFixed(0);
const opsOpt = (ITERATIONS / (timeOpt / 1000)).toFixed(0);
const speedup = ((timeUnopt - timeOpt) / timeUnopt * 100).toFixed(2);

console.log(`--- MUTATION OBSERVER BENCHMARK RESULTS ---`);
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Unoptimized Time: ${timeUnopt.toFixed(2)} ms (${opsUnopt} ops/sec)`);
console.log(`Optimized Time:   ${timeOpt.toFixed(2)} ms (${opsOpt} ops/sec)`);
console.log(`Improvement:      ${speedup}% faster`);
