'use strict';

// Exercise the same progressive disclosure a user uses. A default layout has
// nothing to reset, so close the menu instead of clicking a disabled action.
async function resetHomeLayout(page) {
  const trigger = page.locator('#layout-options-trigger');
  const menu = page.locator('#layout-options-menu');
  if (!(await menu.isVisible())) await trigger.click();
  const reset = page.locator('#reset-home-layout');
  if (await reset.isEnabled()) await reset.click();
  else await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden' });
}

module.exports = { resetHomeLayout };
