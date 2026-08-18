/**
 * middleware/flash.js
 * ---------------------------------------------------------------
 * A tiny "flash message" helper written by hand (no extra package).
 *
 * A flash message is a one-time message stored in the session, for
 * example "Registration successful, please login". It is shown on the
 * NEXT page the user sees and then deleted.
 *
 * This middleware moves the message from the session into res.locals
 * so that every EJS view can simply use `flash`.
 * ---------------------------------------------------------------
 */

function flashMiddleware(req, res, next) {
  // Take the message out of the session (and remove it)
  res.locals.flash = (req.session && req.session.flash) || null;
  if (req.session && req.session.flash) {
    delete req.session.flash;
  }

  // Make the logged-in user available to every view (for the navbar)
  res.locals.currentUser = (req.session && req.session.user) || null;

  // Helper used by views so we can highlight the active nav link
  res.locals.path = req.path;

  next();
}

module.exports = flashMiddleware;
