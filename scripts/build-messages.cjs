#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Messages = require('../public/assets/heavenly-messages');

const sourcePath = path.resolve(__dirname, '../public/assets/heavenly-messages.json');
const outputPath = path.resolve(__dirname, '../public/assets/heavenly-messages-data.js');

function generate(data) {
  Messages.validateData(data);
  // Keep authored strings inert even if this asset is ever embedded in HTML.
  const serialized = JSON.stringify(data, null, 2).replace(/[<>&\u2028\u2029]/g, character => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029'
  }[character]));
  return '/* Generated from heavenly-messages.json. Run node scripts/build-messages.cjs; do not edit. */\n' +
    '(function (root, factory) {\n' +
    "  if (typeof module === 'object' && module.exports) module.exports = factory();\n" +
    '  else root.HeavenlyMessagesData = factory();\n' +
    "}(typeof self !== 'undefined' ? self : this, function () {\n" +
    "  'use strict';\n" +
    '  return ' + serialized + ';\n' +
    '}));\n';
}

function build(check) {
  const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const generated = generate(data);
  if (check) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== generated) {
      throw new Error('Message browser data is stale. Run node scripts/build-messages.cjs and include both source files.');
    }
  } else fs.writeFileSync(outputPath, generated);
  return generated;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.length === 1 && args[0] !== '--check') throw new Error('Usage: node scripts/build-messages.cjs [--check]');
    build(args[0] === '--check');
    console.log(args[0] === '--check' ? 'Message browser data matches the validated JSON source.' : 'Built validated message browser data.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {generate, build};
