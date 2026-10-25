(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyPicks = factory();
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  // Reviewed public content only. Developer HQ drafts are kept separately.
  // Item schema: {id, title, url, description?, icon?, thumbnail?, order,
  // tags?: string[], enabled: boolean}. Stable IDs survive future releases.
  return { schema: 1, version: '2026.10.24.1', items: [] };
});
