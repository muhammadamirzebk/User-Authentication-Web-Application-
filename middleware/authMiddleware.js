/**
 * middleware/authMiddleware.js
 * ---------------------------------------------------------------
 * CUSTOM AUTHENTICATION MIDDLEWARE.
 *
 * Middleware is a function that sits BETWEEN the incoming request and
 * the controller. Express runs it first and it decides whether the
 * request is allowed to continue (next()) or not (redirect).
 *
 * Flow:  Request -> isAuthenticated -> check session -> allow OR redirect
 * ---------------------------------------------------------------
 */

/**
 * Protects private pages (/dashboard, /profile).
 * If the session contains a logged-in user -> continue to the controller.
 * If not -> send the visitor to the login page with a message.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // authenticated -> hand over to the controller
  }

  // Not authenticated -> remember why and go to the login page
  req.session.flash = {
    type: 'error',
    message: 'Please login to access this page.',
  };

  return req.session.save(() => res.redirect('/login'));
}

/**
 * The opposite guard: used on /login and /register.
 * A user who is already logged in should not see the login form again,
 * so we send them straight to the dashboard.
 */
function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = { isAuthenticated, isGuest };
