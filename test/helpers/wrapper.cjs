// Small DOM fixture for the existing launcher tests; document writing is forbidden.
module.exports = function blankWindow() {
  function element(tag) {
    return { tagName: tag.toUpperCase(), children: [], style: {}, attributes: {},
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
    };
  }
  const doc = { title: '', head: element('head'), body: element('body'), documentElement: element('html'), createElement: element,
    open() { throw new Error('document.open must not be used'); },
    write() { throw new Error('document.write must not be used'); },
    getElementById(id) {
      function find(node) { return node.id === id ? node : node.children.map(find).find(Boolean); }
      return find(doc.body) || find(doc.head);
    }
  };
  const listeners = {};
  return { document: doc, location: { href: 'about:blank', replace(url) { this.href = url; } },
    setTimeout() {}, addEventListener(name, fn) { listeners[name] = fn; }, listeners,
    sessionStorage: { getItem() { return null; }, setItem() {} }
  };
};
