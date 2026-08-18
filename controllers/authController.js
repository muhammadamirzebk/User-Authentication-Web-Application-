/**
 * controllers/authController.js
 * ---------------------------------------------------------------
 * CONTROLLER layer of MVC.
 *
 * The controller contains the application / business logic:
 *  - validate what the user typed
 *  - talk to the Model (User) which talks to MongoDB
 *  - decide which View to render or where to redirect
 *
 * It does NOT contain HTML (that is the View) and it does NOT contain
 * the database schema (that is the Model).
 * ---------------------------------------------------------------
 */

const User = require('../models/User');

/* ------------------------------------------------------------------ */
/* Small validation helpers (server-side validation is mandatory)      */
/* ------------------------------------------------------------------ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required.');
  else if (name.trim().length < 3) errors.push('Name must be at least 3 characters long.');

  if (!email || !email.trim()) errors.push('Email is required.');
  else if (!EMAIL_REGEX.test(email.trim())) errors.push('Please enter a valid email address.');

  if (!password) errors.push('Password is required.');
  else if (password.length < 6) errors.push('Password must be at least 6 characters long.');

  if (!confirmPassword) errors.push('Please confirm your password.');
  else if (password && password !== confirmPassword) errors.push('Password and Confirm Password do not match.');

  return errors;
}

/* ------------------------------------------------------------------ */
/* GET /  and  GET /login   -> show the login page                     */
/* ------------------------------------------------------------------ */

exports.getLogin = (req, res) => {
  // After POST /logout the session is destroyed, so the success message
  // is carried in the URL (?loggedout=1) instead of in the session.
  if (req.query.loggedout === '1') {
    res.locals.flash = {
      type: 'success',
      message: 'You have been logged out successfully.',
    };
  }

  res.status(200).render('login', {
    title: 'Login',
    errors: [],
    formData: {},
  });
};

/* ------------------------------------------------------------------ */
/* GET /register  -> show the registration page                        */
/* ------------------------------------------------------------------ */

exports.getRegister = (req, res) => {
  res.status(200).render('register', {
    title: 'Register',
    errors: [],
    formData: {},
  });
};

/* ------------------------------------------------------------------ */
/* POST /register -> create a new user                                 */
/*                                                                     */
/* Browser -> Express -> Validation -> Controller -> Model -> MongoDB   */
/* ------------------------------------------------------------------ */

exports.postRegister = async (req, res, next) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const confirmPassword = req.body.confirmPassword || '';

  const formData = { name, email };

  try {
    // 1. Server-side validation
    const errors = validateRegistration({ name, email, password, confirmPassword });

    if (errors.length > 0) {
      return res.status(400).render('register', {
        title: 'Register',
        errors,
        formData,
      });
    }

    // 2. Is this email already registered? (MODEL -> MongoDB read)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).render('register', {
        title: 'Register',
        errors: ['An account with this email already exists. Please login instead.'],
        formData,
      });
    }

    // 3. Create the user. The password is hashed automatically by the
    //    pre('save') hook inside models/User.js  (MODEL -> MongoDB write)
    await User.create({ name, email, password });

    // 4. Success -> go to the login page with a success message
    req.session.flash = {
      type: 'success',
      message: 'Registration successful! Please login with your credentials.',
    };
    return req.session.save(() => res.redirect('/login'));
  } catch (err) {
    // Duplicate key error thrown by the unique index on email
    if (err && err.code === 11000) {
      return res.status(409).render('register', {
        title: 'Register',
        errors: ['An account with this email already exists. Please login instead.'],
        formData,
      });
    }

    // Mongoose schema validation errors
    if (err && err.name === 'ValidationError') {
      return res.status(400).render('register', {
        title: 'Register',
        errors: Object.values(err.errors).map((e) => e.message),
        formData,
      });
    }

    return next(err); // anything else -> central error handler
  }
};

/* ------------------------------------------------------------------ */
/* POST /login -> authenticate an existing user                        */
/* ------------------------------------------------------------------ */

exports.postLogin = async (req, res, next) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const formData = { email };

  try {
    // 1. Basic validation
    const errors = [];
    if (!email) errors.push('Email is required.');
    else if (!EMAIL_REGEX.test(email)) errors.push('Please enter a valid email address.');
    if (!password) errors.push('Password is required.');

    if (errors.length > 0) {
      return res.status(400).render('login', { title: 'Login', errors, formData });
    }

    // 2. Find the user by email (MODEL -> MongoDB)
    const user = await User.findOne({ email });

    // 3. Compare the typed password with the stored bcrypt hash.
    //    The SAME generic message is used for "user not found" and
    //    "wrong password" so attackers cannot discover valid emails.
    const passwordMatches = user ? await user.comparePassword(password) : false;

    if (!user || !passwordMatches) {
      return res.status(401).render('login', {
        title: 'Login',
        errors: ['Invalid email or password. Please try again.'],
        formData,
      });
    }

    // 4. Credentials are correct -> create the authenticated session.
    //    Only safe identification data is stored - NEVER the password.
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      req.session.userId = user._id.toString();
      req.session.user = { id: user._id.toString(), name: user.name, email: user.email };
      req.session.flash = { type: 'success', message: `Welcome back, ${user.name}!` };

      // 5. Save the session, then go to the protected dashboard
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.redirect('/dashboard');
      });
    });
  } catch (err) {
    return next(err);
  }
};

/* ------------------------------------------------------------------ */
/* GET /dashboard -> protected page (runs AFTER authMiddleware)        */
/* ------------------------------------------------------------------ */

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      // The account was deleted while the session was still alive
      return req.session.destroy(() => res.redirect('/login'));
    }

    return res.status(200).render('dashboard', { title: 'Dashboard', user });
  } catch (err) {
    return next(err);
  }
};

/* ------------------------------------------------------------------ */
/* GET /profile -> protected page, shows real data from MongoDB        */
/* ------------------------------------------------------------------ */

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => res.redirect('/login'));
    }

    return res.status(200).render('profile', { title: 'My Profile', user });
  } catch (err) {
    return next(err);
  }
};

/* ------------------------------------------------------------------ */
/* POST /logout -> destroy the session                                 */
/* ------------------------------------------------------------------ */

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    // Remove the session cookie from the browser as well
    res.clearCookie('sid');

    // A brand new session only to carry the success message
    return res.redirect('/login?loggedout=1');
  });
};
