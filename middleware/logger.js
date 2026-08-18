/**
 * middleware/logger.js
 * ---------------------------------------------------------------
 * A second (very small) custom middleware: a request logger.
 * It runs for EVERY request and prints method, URL and status code.
 * Useful during the viva to show that middleware runs before routes.
 * ---------------------------------------------------------------
 */

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next(); // always pass control to the next middleware / route
}

module.exports = requestLogger;
