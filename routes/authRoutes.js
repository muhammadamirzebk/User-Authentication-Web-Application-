/**
 * routes/authRoutes.js
 * ---------------------------------------------------------------
 * ROUTES layer of MVC.
 *
 * Routes only map a URL + HTTP method to a controller function, and
 * attach middleware where a page must be protected. There is no
 * business logic here.
 * ---------------------------------------------------------------
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { isAuthenticated, isGuest } = require('../middleware/authMiddleware');

/* ---------------------------- Public ---------------------------- */

// GET /            -> Login / Home page
router.get('/', isGuest, authController.getLogin);

// GET /login       -> Login page
router.get('/login', isGuest, authController.getLogin);

// POST /login      -> Authenticate an existing user
router.post('/login', authController.postLogin);

// GET /register    -> Registration page
router.get('/register', isGuest, authController.getRegister);

// POST /register   -> Create a new user
router.post('/register', authController.postRegister);

/* --------------------------- Protected -------------------------- */
/* isAuthenticated runs BEFORE the controller. If there is no valid  */
/* session the user is redirected to /login and the controller never */
/* runs at all.                                                      */

// GET /dashboard   -> Protected dashboard
router.get('/dashboard', isAuthenticated, authController.getDashboard);

// GET /profile     -> Protected profile
router.get('/profile', isAuthenticated, authController.getProfile);

/* ---------------------------- Logout ---------------------------- */

// POST /logout     -> Destroy the session and go back to login
router.post('/logout', authController.postLogout);

module.exports = router;
