# User Authentication Web Application

**Web Technologies (CS 311 / CS 224) — Assignment No. 03 — Summer 2026**

A complete user authentication web application built with **Node.js, Express.js, MongoDB,
Mongoose and EJS**, following the **MVC (Model–View–Controller)** architecture.

It demonstrates the full request path:

```
Browser → Express → Middleware → Controller → Model → MongoDB
```

---

## 1. Project description

The application lets a visitor create an account, log in with those credentials, and then
access two pages that are only available to authenticated users (Dashboard and Profile).
Passwords are hashed with bcrypt, the login state is kept in an Express **session**, and
the private pages are guarded by a **custom authentication middleware**.

---

## 2. Features

- User registration with Name, Email, Password and Confirm Password
- Full **server-side** validation (required fields, email format, password length, password match)
- Duplicate email detection (schema-level unique index **and** an explicit check)
- Password hashing with **bcryptjs** — plain-text passwords are never stored
- Login with email + password, verified against the stored hash
- Authenticated **Express session** stored in MongoDB (`connect-mongo`)
- **Protected** Dashboard and Profile pages
- Custom **authentication middleware** (`isAuthenticated`) and a custom **request logger** middleware
- Logout that destroys the session and clears the cookie
- Flash success / error messages
- Custom **404 page** and a central **error handler**
- Responsive custom CSS (no UI framework), works on desktop and mobile
- Small vanilla-JS helpers: show/hide password, live "passwords match" hint
- Automated end-to-end test suite covering all 13 tests from the assignment

---

## 3. Technologies used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime that runs the server |
| Express.js | Web framework: server, routing, middleware |
| MongoDB | Database that stores users and sessions |
| Mongoose | ODM used to define the User schema and query MongoDB |
| EJS | Template engine that generates the HTML pages |
| HTML / CSS | Structure and styling of the interface |
| JavaScript | Server logic and small client-side helpers |
| bcryptjs | Password hashing |
| express-session | Keeps the user logged in |
| connect-mongo | Stores sessions inside MongoDB |
| dotenv | Loads environment variables from `.env` |
| nodemon (dev) | Restarts the server automatically while developing |

---

## 4. Project structure

```
authentication-app/
│
├── api/
│   └── index.js              # Serverless entry point used by Vercel
│
├── config/
│   └── db.js                 # MongoDB connection (reads MONGODB_URI)
│
├── controllers/
│   └── authController.js     # Business logic: register, login, dashboard, profile, logout
│
├── middleware/
│   ├── authMiddleware.js     # isAuthenticated / isGuest  (protects private routes)
│   ├── flash.js              # One-time success/error messages + current user for views
│   └── logger.js             # Request logger (custom middleware)
│
├── models/
│   └── User.js               # Mongoose User schema + password hashing + compare
│
├── routes/
│   └── authRoutes.js         # Maps URLs to controller functions
│
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── profile.ejs
│   ├── 404.ejs
│   └── error.ejs
│
├── public/
│   ├── css/style.css
│   └── js/script.js
│
├── tests/
│   └── e2e.test.js           # Automated test of the whole authentication workflow
│
├── .env                      # YOUR secrets (never committed)
├── .env.example              # Variable names only
├── .gitignore
├── app.js                    # Express app configuration (shared by server.js and Vercel)
├── server.js                 # Local entry point (npm start)
├── vercel.json               # Vercel deployment configuration
├── package.json
├── README.md
├── VIVA_NOTES.md
└── REPORT_CONTENT.md
```

---

## 5. Installation

```bash
# 1. Go into the project folder
cd authentication-app

# 2. Install the dependencies
npm install
```

---

## 6. Environment variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env       # Windows: copy .env.example .env
```

`.env`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/authapp?retryWrites=true&w=majority
SESSION_SECRET=some-very-long-random-string
PORT=3000
```

Generate a strong session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `.env` is listed in `.gitignore`, so your real credentials are never pushed to GitHub.

---

## 7. MongoDB setup (MongoDB Atlas — free)

1. Go to <https://www.mongodb.com/cloud/atlas/register> and create a free account.
2. Create a **free M0 cluster** (any cloud provider / region).
3. **Database Access** → *Add New Database User* → username + password
   (write the password down; avoid `@ : / ?` characters or URL-encode them).
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   This is required so that Vercel's servers can reach the database.
5. **Database → Connect → Drivers → Node.js** and copy the connection string.
6. Replace `<password>` with your real password and add the database name `authapp`:

```
mongodb+srv://myuser:MyPass123@cluster0.abcde.mongodb.net/authapp?retryWrites=true&w=majority
```

7. Paste it into `.env` as `MONGODB_URI`.

A **local** MongoDB works too: `MONGODB_URI=mongodb://127.0.0.1:27017/authapp`

---

## 8. How to run locally

```bash
npm start        # production style
npm run dev      # with nodemon (auto restart)
```

Then open <http://localhost:3000>.

Run the automated test suite (needs a reachable MongoDB in `MONGODB_URI`):

```bash
npm test
```

---

## 9. Routes

| Method | Route | Protected | Purpose |
|---|---|---|---|
| GET | `/` | No | Login / Home page |
| GET | `/register` | No | Registration form |
| POST | `/register` | No | Create a new user |
| GET | `/login` | No | Login form |
| POST | `/login` | No | Authenticate the user |
| GET | `/dashboard` | **Yes** | Protected dashboard |
| GET | `/profile` | **Yes** | Protected profile |
| POST | `/logout` | — | Destroy the session |
| any | anything else | — | 404 page |

---

## 10. Authentication flow

**Registration**

```
Browser → POST /register → Express → server-side validation → authController.postRegister
        → User model (bcrypt hash in pre-save hook) → MongoDB → redirect to /login
```

**Login**

```
Browser → POST /login → Express → authController.postLogin → User model → MongoDB
        → bcrypt.compare(typed password, stored hash)
        → req.session.userId is set  → redirect to /dashboard
```

**Protected route**

```
Browser → GET /dashboard → Express → isAuthenticated middleware
        → session contains userId?  YES → controller → model → MongoDB → dashboard.ejs
                                    NO  → redirect to /login
```

**Logout**

```
Browser → POST /logout → authController.postLogout → req.session.destroy()
        → cookie cleared → redirect to /login
```

---

## 11. MVC explanation

| Layer | Files | Responsibility |
|---|---|---|
| **Model** | `models/User.js` | Defines the user data, talks to MongoDB, hashes and compares passwords |
| **View** | `views/*.ejs` | Only the user interface (HTML produced by EJS) |
| **Controller** | `controllers/authController.js` | Application logic: validate, decide, call the model, choose the view |
| **Routes** | `routes/authRoutes.js` | Connect a URL + method to a controller function |
| **Middleware** | `middleware/*.js` | Runs before the controller: authentication, logging, flash messages |
| **Config** | `config/db.js`, `app.js`, `server.js` | Database connection and application setup |

`server.js` only starts the server — no business logic lives there.

---

## 12. Security features

1. Passwords hashed with bcryptjs (salt rounds = 10) inside a Mongoose `pre('save')` hook.
2. Plain-text passwords are never stored and never placed in the session.
3. All secrets come from environment variables (`.env`), nothing is hard-coded.
4. `.env` is in `.gitignore`; `.env.example` contains variable names only.
5. Server-side validation of every field (client-side JS is only a convenience).
6. Private routes are protected by `isAuthenticated` middleware.
7. The session id is regenerated at login (prevents session fixation).
8. Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
9. Login errors are generic ("Invalid email or password") so valid emails cannot be discovered.
10. In production the error page shows a friendly message — no stack traces.
11. Sessions are stored in MongoDB and destroyed completely on logout.

---

## 13. GitHub deployment notes

```bash
git init
git add .
git commit -m "Web Technologies Assignment 03 - User Authentication App"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Before pushing, confirm that secrets are not included:

```bash
git status --short        # .env must NOT appear
git check-ignore -v .env  # should print the .gitignore rule
```

---

## 14. Vercel deployment notes

A normal `app.listen()` server does **not** work on Vercel, because Vercel runs
*serverless functions* instead of a long-running server. This project therefore ships:

- `api/index.js` — exports the Express app as a serverless function
- `vercel.json` — routes every request to that function and includes the `views/` and
  `public/` folders in the deployment bundle

**Steps**

1. Push the project to GitHub (section 13).
2. Go to <https://vercel.com/signup> and sign in **with GitHub**.
3. **Add New… → Project → Import** your repository.
4. Leave the framework preset as *Other*. Do not set a build command.
5. Open **Environment Variables** and add these three (Production, Preview and Development):

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | your full Atlas connection string |
   | `SESSION_SECRET` | a long random string |
   | `NODE_ENV` | `production` |

6. Click **Deploy** and wait for the build to finish.
7. Open the generated URL, e.g. `https://your-project.vercel.app`.

**Important:** in MongoDB Atlas → *Network Access*, IP `0.0.0.0/0` must be allowed,
otherwise the deployed app cannot reach the database.

If you change environment variables later, redeploy from the Vercel dashboard
(*Deployments → … → Redeploy*) so the new values are picked up.

---

## 15. Test results

`npm test` runs the complete workflow from the assignment (34 assertions, including all
13 required tests): registration, validation errors, duplicate email, wrong password,
successful login, protected pages, logout, blocked access after logout, and the 404 page.
