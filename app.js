/**
 * app.js
 * ---------------------------------------------------------------
 * Builds and configures the Express application.
 *
 * It is kept separate from server.js so that the SAME application can
 * be started in two ways:
 *   - server.js      -> normal Node server (local development)
 *   - api/index.js   -> serverless function (Vercel deployment)
 *
 * This file only CONFIGURES the app. All business logic lives in the
 * controllers, all data logic in the models, all HTML in the views.
 * ---------------------------------------------------------------
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');
const requestLogger = require('./middleware/logger');
const flashMiddleware = require('./middleware/flash');
const authRoutes = require('./routes/authRoutes');

const app = express();

/**
 * Helper: find a project folder ("views" / "public").
 * Locally __dirname is the project root. On Vercel the code may be
 * bundled into /var/task/api, so we also check the working directory.
 * This keeps EJS views and static CSS/JS working in both environments.
 */
function resolveProjectDir(folder) {
  const candidates = [
    path.join(__dirname, folder),
    path.join(process.cwd(), folder),
    path.join(__dirname, '..', folder),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

const VIEWS_DIR = resolveProjectDir('views');
const PUBLIC_DIR = resolveProjectDir('public');

/* ------------------------------------------------------------------ */
/* 1. View engine (EJS) + views folder                                 */
/* ------------------------------------------------------------------ */
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

/* ------------------------------------------------------------------ */
/* 2. Built-in Express middleware                                      */
/* ------------------------------------------------------------------ */

// Needed on Vercel/any proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// Parse HTML form submissions (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies
app.use(express.json());

// Serve static files: /css/style.css and /js/script.js
app.use(express.static(PUBLIC_DIR));

// Custom middleware #1: log every request
app.use(requestLogger);

/* ------------------------------------------------------------------ */
/* 3. Sessions (authentication state)                                  */
/*                                                                     */
/* Sessions are stored inside MongoDB (collection "sessions") using    */
/* connect-mongo. The default in-memory store would lose every login   */
/* whenever the server restarts, and does not work at all on Vercel    */
/* where each request can run in a different serverless instance.      */
/* ------------------------------------------------------------------ */
let sessionStore; // undefined -> express-session uses its default MemoryStore

if (process.env.MONGODB_URI) {
  sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24, // sessions expire after 1 day
    touchAfter: 60, // do not rewrite the session on every request
  });

  // Never let a store error crash the whole process
  sessionStore.on('error', (e) => console.error('[session store]', e.message));
} else {
  console.warn('[warn] MONGODB_URI is missing - the app cannot store sessions or users.');
}

app.use(
  session({
    name: 'sid', // cookie name (default "connect.sid")
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-your-env-file',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true, // JavaScript in the browser cannot read the cookie
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // basic CSRF protection
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

/* ------------------------------------------------------------------ */
/* 4. Make the database connection ready before any route runs         */
/* ------------------------------------------------------------------ */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/* 5. Custom middleware #2: flash messages + current user for views    */
/* ------------------------------------------------------------------ */
app.use(flashMiddleware);

/* ------------------------------------------------------------------ */
/* 6. Application routes                                               */
/* ------------------------------------------------------------------ */
app.use('/', authRoutes);

/* ------------------------------------------------------------------ */
/* 7. 404 handler - runs when no route above matched the URL           */
/* ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

/* ------------------------------------------------------------------ */
/* 8. Central error handler - 4 arguments tell Express it is an        */
/*    error handler. Technical details are logged on the server only.  */
/* ------------------------------------------------------------------ */
app.use((err, req, res, next) => {
  console.error('[error]', err);

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).render('error', {
    title: 'Something went wrong',
    // Never show stack traces / DB details to normal users in production
    message: isProduction
      ? 'Something went wrong on our side. Please try again later.'
      : err.message,
  });
});

module.exports = app;
