#!/usr/bin/env node
'use strict';
// Compile the Developer HQ's reviewed manifest; no network or browser storage.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const previous = require('../public/assets/heavenly-official-order');
const model = require('../public/assets/heavenly-dev-hq-model');
const source = path.join(__dirname, '../public/assets/heavenly-official-order.json');
const destination = path.join(__dirname, '../public/assets/heavenly-official-order.js');
const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
if (!/^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(manifest.catalogVersion || '')) throw new Error('Use a dated official catalog version.');
if (manifest.catalogVersion !== previous.catalogVersion && !model.newer(manifest.catalogVersion, previous.catalogVersion)) throw new Error('The official catalog version cannot go backwards.');
if (manifest.catalogVersion === previous.catalogVersion && JSON.stringify(manifest) !== JSON.stringify(previous)) throw new Error('Bump catalogVersion when changing official defaults.');
// Validate against the candidate bridge, so adding a canonical content definition
// and its manifest entry does not require a valid *old* bridge to bootstrap.
const context = {HeavenlyNavigation:require('../public/assets/heavenly-navigation'), HeavenlyOfficialOrder:manifest};
context.self = context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/assets/heavenly-catalog.js'), 'utf8'), context);
const catalog = context.HeavenlyCatalog;
model.validate(manifest, catalog.release);
catalog.applyOfficialOrder(JSON.parse(JSON.stringify(catalog.defaults)), manifest);
const generated = '/* Generated from heavenly-official-order.json by scripts/build-official-order.cjs. */\n' +
  '(function(root){\n  var data = ' + JSON.stringify(manifest).replace(/</g, '\\u003c') + ';\n' +
  "  if(typeof module==='object' && module.exports) module.exports=data;\n  else root.HeavenlyOfficialOrder=data;\n" +
  "}(typeof self!=='undefined'?self:this));\n";
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== generated) throw new Error('Official order bridge is stale. Run node scripts/build-official-order.cjs.');
  process.stdout.write('Official order source and bridge are valid.\n');
} else {
  fs.writeFileSync(destination, generated);
  process.stdout.write('Validated official order bridge generated. Review and commit the JSON and JS together.\n');
}
