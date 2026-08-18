/**
 * tests/e2e.test.js
 * ---------------------------------------------------------------
 * End-to-end test of the complete authentication workflow.
 * It runs the 13 tests listed in the assignment.
 *
 * How it gets a database:
 *   - if MONGODB_URI is set in the environment, that database is used;
 *   - otherwise it tries the optional dev package "mongodb-memory-server"
 *     (install with:  npm install --no-save mongodb-memory-server).
 *
 * Run with:  npm test
 * ---------------------------------------------------------------
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-value-for-e2e-tests';

const assert = require('assert');
const http = require('http');

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

/* ------------------------- tiny cookie jar ------------------------- */

function makeJar() {
  const jar = {};
  return {
    apply(headers = {}) {
      const pairs = Object.entries(jar).map(([k, v]) => `${k}=${v}`);
      if (pairs.length) headers.cookie = pairs.join('; ');
      return headers;
    },
    store(res) {
      const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      setCookie.forEach((c) => {
        const [pair] = c.split(';');
        const idx = pair.indexOf('=');
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(c)) delete jar[name];
        else jar[name] = value;
      });
    },
    clear() {
      Object.keys(jar).forEach((k) => delete jar[k]);
    },
    raw: jar,
  };
}

async function request(base, jar, method, path, form) {
  const headers = jar.apply({});
  let body;

  if (form) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }

  const res = await fetch(base + path, { method, headers, body, redirect: 'manual' });
  jar.store(res);
  const text = await res.text();
  return { status: res.status, location: res.headers.get('location'), text };
}

/* ------------------------------ main ------------------------------- */

(async () => {
  let memoryServer = null;

  if (!process.env.MONGODB_URI) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      process.env.MONGODB_URI = memoryServer.getUri('authapp_test');
      console.log('Using in-memory MongoDB for tests.\n');
    } catch (e) {
      console.error('No MONGODB_URI set and mongodb-memory-server is not installed.');
      console.error('Run:  npm install --no-save mongodb-memory-server');
      process.exit(1);
    }
  }

  const app = require('../app');
  const connectDB = require('../config/db');
  const mongoose = require('mongoose');
  const User = require('../models/User');

  await connectDB();
  await User.deleteMany({});

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const jar = makeJar();
  const EMAIL = 'ali.khan@example.com';
  const PASSWORD = 'Secret123';

  console.log('Running assignment test suite\n');

  // TEST 1 - GET /
  let r = await request(base, jar, 'GET', '/');
  check('TEST 1  GET /            shows the login page',
    r.status === 200 && r.text.includes('Welcome back') && r.text.includes('name="email"'), `(status ${r.status})`);

  // TEST 2 - GET /register
  r = await request(base, jar, 'GET', '/register');
  check('TEST 2  GET /register    shows the registration page',
    r.status === 200 && r.text.includes('Create your account') && r.text.includes('confirmPassword'), `(status ${r.status})`);

  // TEST 5 (run before 3) - mismatched passwords
  r = await request(base, jar, 'POST', '/register', {
    name: 'Ali Khan', email: EMAIL, password: PASSWORD, confirmPassword: 'Different1',
  });
  check('TEST 5  Register with mismatched passwords -> validation error',
    r.status === 400 && r.text.includes('do not match'), `(status ${r.status})`);

  // extra - missing fields
  r = await request(base, jar, 'POST', '/register', { name: '', email: '', password: '', confirmPassword: '' });
  check('EXTRA   Register with empty fields -> validation errors',
    r.status === 400 && r.text.includes('Name is required') && r.text.includes('Email is required'), `(status ${r.status})`);

  // extra - invalid email format
  r = await request(base, jar, 'POST', '/register', {
    name: 'Ali Khan', email: 'not-an-email', password: PASSWORD, confirmPassword: PASSWORD,
  });
  check('EXTRA   Register with invalid email -> validation error',
    r.status === 400 && r.text.includes('valid email'), `(status ${r.status})`);

  // extra - short password
  r = await request(base, jar, 'POST', '/register', {
    name: 'Ali Khan', email: EMAIL, password: '123', confirmPassword: '123',
  });
  check('EXTRA   Register with short password -> validation error',
    r.status === 400 && r.text.includes('at least 6 characters'), `(status ${r.status})`);

  // TEST 3 - valid registration
  r = await request(base, jar, 'POST', '/register', {
    name: 'Ali Khan', email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD,
  });
  check('TEST 3  Valid registration -> redirect to /login',
    r.status === 302 && r.location === '/login', `(status ${r.status}, location ${r.location})`);

  const created = await User.findOne({ email: EMAIL });
  check('TEST 3b User document created in MongoDB', !!created);
  check('TEST 3c Password stored as a bcrypt hash (never plain text)',
    !!created && created.password !== PASSWORD && created.password.startsWith('$2'));
  check('TEST 3d createdAt date is stored', !!created && created.createdAt instanceof Date);

  // success flash shown on the login page
  r = await request(base, jar, 'GET', '/login');
  check('TEST 3e Success message shown on the login page',
    r.text.includes('Registration successful'), '');

  // TEST 4 - duplicate email
  r = await request(base, jar, 'POST', '/register', {
    name: 'Ali Khan', email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD,
  });
  check('TEST 4  Duplicate email -> clear error message',
    r.status === 409 && r.text.includes('already exists'), `(status ${r.status})`);

  const count = await User.countDocuments({ email: EMAIL });
  check('TEST 4b Duplicate did not create a second user', count === 1, `(count ${count})`);

  // TEST 11/12 pre-check - protected routes while logged out
  r = await request(base, jar, 'GET', '/dashboard');
  check('TEST 11a /dashboard while logged out -> redirect to /login',
    r.status === 302 && r.location === '/login', `(status ${r.status}, location ${r.location})`);

  r = await request(base, jar, 'GET', '/profile');
  check('TEST 12a /profile while logged out -> redirect to /login',
    r.status === 302 && r.location === '/login', `(status ${r.status}, location ${r.location})`);

  r = await request(base, jar, 'GET', '/login');
  check('EXTRA   "Please login to access this page." message is shown',
    r.text.includes('Please login to access this page'), '');

  // TEST 6 - wrong password
  r = await request(base, jar, 'POST', '/login', { email: EMAIL, password: 'WrongPassword1' });
  check('TEST 6  Login with wrong password -> error, no session',
    r.status === 401 && r.text.includes('Invalid email or password'), `(status ${r.status})`);

  // extra - unknown email
  r = await request(base, jar, 'POST', '/login', { email: 'nobody@example.com', password: PASSWORD });
  check('EXTRA   Login with unknown email -> same generic error',
    r.status === 401 && r.text.includes('Invalid email or password'), `(status ${r.status})`);

  r = await request(base, jar, 'GET', '/dashboard');
  check('EXTRA   Still blocked from /dashboard after failed login',
    r.status === 302 && r.location === '/login', `(status ${r.status})`);

  // TEST 7 - correct login
  r = await request(base, jar, 'POST', '/login', { email: EMAIL, password: PASSWORD });
  check('TEST 7  Login with correct credentials -> redirect to /dashboard',
    r.status === 302 && r.location === '/dashboard', `(status ${r.status}, location ${r.location})`);
  check('TEST 7b Session cookie "sid" was set', !!jar.raw.sid);

  // TEST 9 - dashboard after login
  r = await request(base, jar, 'GET', '/dashboard');
  check('TEST 9  /dashboard after login -> dashboard with user name',
    r.status === 200 && r.text.includes('Welcome, Ali Khan'), `(status ${r.status})`);

  // TEST 8 - profile after login
  r = await request(base, jar, 'GET', '/profile');
  check('TEST 8  /profile after login -> real user data from MongoDB',
    r.status === 200 && r.text.includes(EMAIL) && r.text.includes('Ali Khan'), `(status ${r.status})`);
  check('TEST 8b Password hash is NOT rendered on the profile page',
    !r.text.includes(created.password), '');

  // extra - logged-in user visiting /login is sent to dashboard
  r = await request(base, jar, 'GET', '/login');
  check('EXTRA   Logged-in user visiting /login -> /dashboard',
    r.status === 302 && r.location === '/dashboard', `(status ${r.status})`);

  // TEST 10 - logout
  r = await request(base, jar, 'POST', '/logout');
  check('TEST 10 Logout -> redirect to the login page',
    r.status === 302 && r.location === '/login?loggedout=1', `(status ${r.status}, location ${r.location})`);

  r = await request(base, jar, 'GET', '/login?loggedout=1');
  check('TEST 10b Logout success message is shown',
    r.text.includes('logged out successfully'), '');

  // TEST 11 - dashboard after logout
  r = await request(base, jar, 'GET', '/dashboard');
  check('TEST 11 /dashboard after logout -> redirect to /login',
    r.status === 302 && r.location === '/login', `(status ${r.status}, location ${r.location})`);

  // TEST 12 - profile after logout
  r = await request(base, jar, 'GET', '/profile');
  check('TEST 12 /profile after logout -> redirect to /login',
    r.status === 302 && r.location === '/login', `(status ${r.status}, location ${r.location})`);

  // extra - stolen/old cookie cannot be replayed
  r = await request(base, jar, 'GET', '/profile');
  check('EXTRA   Destroyed session cannot be reused',
    r.status === 302 && r.location === '/login', `(status ${r.status})`);

  // TEST 13 - 404
  r = await request(base, jar, 'GET', '/this-route-does-not-exist');
  check('TEST 13 Unknown route -> 404 page',
    r.status === 404 && r.text.includes('Page not found'), `(status ${r.status})`);

  // extra - static files are served
  r = await request(base, jar, 'GET', '/css/style.css');
  check('EXTRA   Static CSS is served', r.status === 200 && r.text.includes('.navbar'), `(status ${r.status})`);
  r = await request(base, jar, 'GET', '/js/script.js');
  check('EXTRA   Static JS is served', r.status === 200 && r.text.includes('toggle-password'), `(status ${r.status})`);

  // extra - login is case-insensitive on email
  r = await request(base, jar, 'POST', '/login', { email: EMAIL.toUpperCase(), password: PASSWORD });
  check('EXTRA   Email is case-insensitive at login',
    r.status === 302 && r.location === '/dashboard', `(status ${r.status})`);

  await request(base, jar, 'POST', '/logout');

  console.log(`\n${passed} passed, ${failed} failed\n`);

  server.close();
  await mongoose.connection.close();
  if (memoryServer) await memoryServer.stop();

  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
