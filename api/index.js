/**
 * api/index.js
 * ---------------------------------------------------------------
 * Entry point used by VERCEL.
 *
 * Vercel does not run "node server.js" and does not keep a port open.
 * Instead it calls an exported request handler (a serverless function).
 * Because app.js exports a plain Express app, and an Express app IS a
 * (req, res) handler, we can simply export it here.
 *
 * The MVC structure is untouched: this file adds a deployment entry
 * point, it does not contain any application logic.
 * ---------------------------------------------------------------
 */

const app = require('../app');

module.exports = app;
