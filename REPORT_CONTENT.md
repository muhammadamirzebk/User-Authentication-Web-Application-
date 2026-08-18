# PDF Report Content — User Authentication Web Application

**Course:** Web Technologies (CS 311 / CS 224) · **Assignment No. 03** · Summer 2026
**Department of Computer Science, University of Engineering & Technology, Peshawar**

> Copy these sections into your report document, add your name / roll number, insert the
> screenshots listed in section 15, and export it as PDF.

---

## 1. Introduction

Modern web applications almost always need to know *who* is using them. Authentication is
the process of proving that identity, and authorisation decides what that identity is
allowed to see. This assignment implements a complete user authentication web application
using Node.js, Express.js, MongoDB and EJS, organised according to the MVC
(Model–View–Controller) architecture.

The application allows a visitor to register an account, log in with those credentials,
and then reach two private pages (Dashboard and Profile) that are unavailable to anyone
who is not logged in. It demonstrates the full server-side request path:

```
Browser → Express → Middleware → Controller → Model → MongoDB
```

## 2. Objective

- Build a working authentication system (register, login, protected pages, logout).
- Apply the MVC architecture so that data, interface and logic are clearly separated.
- Use Express middleware and write at least one custom middleware.
- Store users in MongoDB through Mongoose and never store plain-text passwords.
- Maintain the login state with Express sessions.
- Apply basic security practices: hashing, validation, environment variables, protected routes.
- Deploy the finished application to GitHub and Vercel.

## 3. Technologies used

| Technology | Role in the project |
|---|---|
| Node.js | Runs JavaScript on the server |
| Express.js | Web server, routing and middleware |
| MongoDB (Atlas) | Stores users and sessions |
| Mongoose | Schema definition and database queries |
| EJS | Server-side HTML templates |
| HTML5 / CSS3 | Page structure and responsive styling |
| JavaScript | Server logic and small client-side helpers |
| bcryptjs | One-way password hashing |
| express-session + connect-mongo | Session-based authentication stored in MongoDB |
| dotenv | Loads secrets from `.env` |
| Git / GitHub | Version control and source hosting |
| Vercel | Cloud deployment |

## 4. Application features

- Registration form with Name, Email, Password and Confirm Password
- Complete server-side validation with clear error messages
- Duplicate email prevention (explicit check + unique index in MongoDB)
- bcrypt password hashing (10 salt rounds) inside the model
- Login with credential verification against the stored hash
- Session-based authentication with a `httpOnly` cookie
- Protected Dashboard and Profile pages
- Custom authentication middleware and custom request-logger middleware
- Logout that destroys the session and clears the cookie
- Flash success and error messages
- Custom 404 page and a central error handler
- Responsive, framework-free CSS interface

## 5. Registration

The registration page (`views/register.ejs`) submits `POST /register`. The controller
`authController.postRegister` performs the following steps on the **server**:

1. Trim and read `name`, `email`, `password`, `confirmPassword` from `req.body`.
2. Validate: all fields required, name ≥ 3 characters, valid email format,
   password ≥ 6 characters, and password identical to confirm password.
3. Query MongoDB with `User.findOne({ email })`. If a user exists, the response is the
   error "An account with this email already exists."
4. Otherwise `User.create({ name, email, password })` is called. The Mongoose
   `pre('save')` hook hashes the password with bcrypt before the document is written.
5. MongoDB stores the document together with the `createdAt` date.
6. The user is redirected to `/login` with the flash message
   "Registration successful! Please login with your credentials."

Validation errors re-render the form with the messages **and** keep the values the user
already typed, so nothing has to be entered twice.

## 6. Login

The login page submits `POST /login`. `authController.postLogin`:

1. Validates that an email and password were supplied.
2. Loads the user with `User.findOne({ email })`.
3. Compares the typed password with the stored hash using `bcrypt.compare()`.
4. On failure it renders the same generic message "Invalid email or password. Please try
   again." for both a wrong password and an unknown email, so attackers cannot find out
   which emails are registered.
5. On success it regenerates the session (protection against session fixation) and stores
   only `userId`, `name` and `email` — never the password — before redirecting to
   `/dashboard`.

## 7. Dashboard

`GET /dashboard` is protected by the `isAuthenticated` middleware. The page confirms that
the session is active, greets the user by name, shows the email and the account creation
date, and offers navigation to the Profile page and a Logout button. It also displays the
request path (Browser → Express → Middleware → Controller → Model → MongoDB → View) so the
architecture is visible in the interface itself.

## 8. Profile

`GET /profile` is also protected. It displays the logged-in user's Name, Email, account
creation date and MongoDB `_id`. All values are read from the database at request time
with `User.findById(req.session.userId)` — nothing is hard-coded. The password is shown
only as the note "Stored as a bcrypt hash — never in plain text".

## 9. Logout

Logout is a form that submits `POST /logout` (not a GET link, because logging out changes
server state). The controller calls `req.session.destroy()`, which removes the session
document from the `sessions` collection, clears the `sid` cookie and redirects to the
login page with the message "You have been logged out successfully." Any later attempt to
open `/dashboard` or `/profile` is redirected back to `/login`.

## 10. Authentication middleware

Middleware functions run between the request and the controller. The custom middleware
`middleware/authMiddleware.js` contains:

```js
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();   // allow
  req.session.flash = { type: 'error', message: 'Please login to access this page.' };
  return req.session.save(() => res.redirect('/login'));  // block
}
```

It is attached directly in the route definition, so it always executes **before** the
controller:

```js
router.get('/dashboard', isAuthenticated, authController.getDashboard);
router.get('/profile',   isAuthenticated, authController.getProfile);
```

The project also contains a second custom middleware, `middleware/logger.js`, which prints
the method, URL, status code and duration of every request, and `middleware/flash.js`,
which moves one-time messages from the session into the views.

## 11. MVC architecture

| Layer | Files | Responsibility |
|---|---|---|
| Model | `models/User.js` | User schema, hashing, database operations |
| View | `views/*.ejs` | User interface only |
| Controller | `controllers/authController.js` | Business logic and decisions |
| Routes | `routes/authRoutes.js` | URL → controller mapping |
| Middleware | `middleware/*.js` | Authentication, logging, flash messages |
| Config | `config/db.js`, `app.js`, `server.js` | Database connection and app setup |

Separating these layers keeps each file small and understandable, allows the interface to
change without touching the database code, and makes the application easier to test.

## 12. MongoDB

The connection lives in `config/db.js` and reads the connection string from the
environment variable `MONGODB_URI`; it is cached so that repeated requests reuse one
connection. The `User` schema defines:

| Field | Type | Rules |
|---|---|---|
| `name` | String | required, 3–50 characters |
| `email` | String | required, unique, lowercase, valid format |
| `password` | String | required, minimum 6 characters, stored hashed |
| `createdAt` | Date | defaults to the current date/time |

Database operations demonstrated: **create** a user (`User.create`), **find** a user during
login (`User.findOne`), and **retrieve** the logged-in user (`User.findById`). A second
collection, `sessions`, is managed automatically by `connect-mongo`.

A stored document looks like:

```json
{
  "_id": ObjectId("66c1f0a8e13b2a4f9c8d1234"),
  "name": "Ali Khan",
  "email": "ali@example.com",
  "password": "$2a$10$Xy7...hashed...",
  "createdAt": ISODate("2026-08-18T10:15:32.000Z")
}
```

## 13. Security features

1. bcrypt hashing with a random salt (10 rounds); plain-text passwords are never stored.
2. The password is never placed in the session or rendered in a view.
3. All secrets are read from environment variables; nothing is hard-coded.
4. `.env` is listed in `.gitignore`; only `.env.example` (names, no values) is committed.
5. Server-side validation of every input field.
6. Private routes are protected by authentication middleware.
7. The session id is regenerated on login to prevent session fixation.
8. The session cookie is `httpOnly`, `sameSite=lax` and `secure` in production.
9. Generic login errors prevent user enumeration.
10. The production error page shows a friendly message instead of a stack trace.
11. Logout destroys the session document, so an old cookie cannot be replayed.

## 14. Testing

The project contains an automated end-to-end test suite (`tests/e2e.test.js`, run with
`npm test`) which exercises the real HTTP routes against a real MongoDB database.
All of the tests required by the assignment pass:

| # | Test | Expected result | Status |
|---|---|---|---|
| 1 | Open `/` | Login page appears | Pass |
| 2 | Open `/register` | Registration page appears | Pass |
| 3 | Register with valid information | User created in MongoDB, password hashed | Pass |
| 4 | Register again with the same email | Duplicate email error | Pass |
| 5 | Register with mismatched passwords | Validation error | Pass |
| 6 | Login with an incorrect password | Login error | Pass |
| 7 | Login with correct credentials | Authenticated, redirected to Dashboard | Pass |
| 8 | Open `/profile` after login | User information appears | Pass |
| 9 | Open `/dashboard` after login | Dashboard appears | Pass |
| 10 | Logout | Session destroyed, redirected to login | Pass |
| 11 | Visit `/dashboard` after logout | Redirected to login | Pass |
| 12 | Visit `/profile` after logout | Redirected to login | Pass |
| 13 | Open a non-existent route | 404 page appears | Pass |

Additional checks: empty fields, invalid email format, short password, unknown email at
login, case-insensitive email, static CSS/JS delivery, and the fact that a destroyed
session cannot be reused.

## 15. Screenshots to capture

Take these screenshots yourself from your own running application and insert them in the
report with a short caption under each one.

1. **Home / Login page** — `http://localhost:3000/` (or the Vercel URL).
2. **Registration page** — `/register` with the four fields visible.
3. **Registration validation error** — submit with mismatched passwords.
4. **Successful registration** — the login page showing "Registration successful!".
5. **MongoDB user record** — MongoDB Atlas → *Browse Collections* → `authapp.users`,
   showing the hashed password and `createdAt`.
6. **Login error** — login attempt with a wrong password.
7. **Successful login / Dashboard** — the dashboard with your name.
8. **Profile page** — showing Name, Email and account creation date.
9. **Logout** — the login page with "You have been logged out successfully."
10. **Protected route after logout** — type `/dashboard` in the address bar and capture the
    redirect to the login page with "Please login to access this page."
11. **404 page** — open any address that does not exist, e.g. `/abc`.
12. **VS Code project structure** — the Explorer sidebar with `config`, `controllers`,
    `middleware`, `models`, `routes`, `views`, `public` expanded (proves MVC).
13. **Terminal output** — `npm start` showing the server running and MongoDB connected.
14. **Vercel dashboard** — the successful deployment and the Environment Variables screen
    (blur or hide the actual values).
15. **Vercel live website** — the deployed URL open in the browser with the dashboard
    visible.

Optional but impressive: the output of `npm test` showing every test passing.

## 16. Conclusion

The assignment produced a fully working user authentication web application built with
Node.js, Express.js, MongoDB, Mongoose and EJS, organised strictly according to the MVC
architecture. Registration, login, protected pages and logout all work end to end, backed
by a real MongoDB database. Passwords are protected with bcrypt hashing, authentication
state is maintained with Express sessions stored in MongoDB, and private routes are
guarded by a custom middleware that runs before every protected controller.

Building the project clarified how the layers of a real web application fit together —
how a request travels from the browser through Express and its middleware to a controller,
then to the model and the database, and how the answer travels back through a view as
finished HTML. It also showed why security practices such as hashing, server-side
validation and keeping credentials in environment variables are not optional extras but a
normal part of writing a web application.
