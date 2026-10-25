'use strict';

// Follow the same disclosure controls a user uses; never force-click hidden settings.
async function revealSettingsControl(page, selector) {
  const control = page.locator(selector).first();
  const groups = page.locator('details').filter({ has: control });
  for (const group of await groups.all()) {
    if (!(await group.evaluate(node => node.open))) await group.locator(':scope > summary').click();
  }
  return control;
}

module.exports = { revealSettingsControl };
