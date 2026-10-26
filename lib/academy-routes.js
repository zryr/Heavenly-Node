'use strict';
var fs = require('fs');
var path = require('path');
var names = ['home', 'about', 'programs', 'students', 'resources', 'calendar', 'admissions', 'terms', 'privacy', 'accessibility', 'status', 'credits'];
function recovery(name) {
  try { return fs.readFileSync(path.join(__dirname, '../public/academy-errors', name + '.html'), 'utf8'); }
  catch (_) { return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Academy page unavailable</title><h1>Academy page unavailable</h1><p>Try again or return to <a href="/academy">Academy home</a>.</p></html>'; }
}
// Cache recovery documents independently of the requested page read. A genuine
// sendFile failure can therefore return useful HTML without a second disk read.
var unavailable = recovery('unavailable');
var notFound = recovery('not-found');
function missingPage(req, res) { return res.status(404).type('html').send(notFound); }
function createHandler(documentsRoot) {
  documentsRoot = documentsRoot || path.join(__dirname, '../public/academy');
  return function academyPage(req, res, next) {
    var page = req.params.page || 'home';
    if (names.indexOf(page) === -1) return missingPage(req, res);
    res.sendFile(path.join(documentsRoot, page + '.html'), function (error) {
      if (!error) return;
      if (res.headersSent) return next(error);
      res.status(503).type('html').send(unavailable);
    });
  };
}
module.exports = { createHandler: createHandler, notFound: missingPage, pages: names };
