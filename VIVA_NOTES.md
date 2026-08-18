# VIVA NOTES — User Authentication Web Application

Simple answers, all based on the actual code in this project.
Read this once before the viva and you can explain every file.

---

## 1. What is Node.js?

Node.js is a program that runs JavaScript **outside the browser**, on the computer/server.
Normally JavaScript only runs inside a web page; Node.js lets us use the same language to
build the server. Our whole backend (`server.js`, controllers, models) runs on Node.js.

## 2. What is Express.js?

Express.js is a small framework built on top of Node.js that makes it easy to:

- create a web server,
- define routes (`GET /login`, `POST /register`, …),
- use middleware,
- send HTML back to the browser.

Without Express we would have to write a lot of low-level HTTP code by hand.
In this project Express is configured in `app.js`.

## 3. What is MongoDB?

MongoDB is a **NoSQL database**. Instead of tables and rows it stores **collections** of
**documents**, and a document looks like a JSON object. Our users are stored in the
`users` collection and our sessions in the `sessions` collection.

## 4. What is Mongoose?

Mongoose is an **ODM (Object Data Modeling)** library for MongoDB in Node.js.
It lets us define a **schema** (which fields a user must have, which are required, which
must be unique) and gives us easy methods like `User.findOne()`, `User.create()`.
Our schema is in `models/User.js`.

## 5. What is EJS?

EJS (Embedded JavaScript) is a **template engine**. We write normal HTML files and insert
data with `<%= %>` and logic with `<% %>`. The server fills the template with real data and
sends finished HTML to the browser.

Example from `views/dashboard.ejs`:

```ejs
<h1>Welcome, <%= user.name %></h1>
```

## 6. What is MVC?

MVC = **Model – View – Controller**. It is a way of organising code so that each part has
one job:

- **Model** = data,
- **View** = what the user sees,
- **Controller** = the logic that connects them.

This makes the project easier to read, test and extend.

## 7. What is a Model?

The Model describes and manages the data. Here `models/User.js` defines that a user has
`name`, `email`, `password` and `createdAt`, that the email must be unique, and it also
hashes the password before saving. All communication with MongoDB happens through it.

## 8. What is a View?

The View is the user interface. In this project the views are the EJS files in `views/`:
`login.ejs`, `register.ejs`, `dashboard.ejs`, `profile.ejs`, `404.ejs`, `error.ejs`.
Views only display data — they never talk to the database.

## 9. What is a Controller?

The Controller contains the application logic. `controllers/authController.js` validates
the form data, asks the Model to create or find a user, creates or destroys the session,
and finally decides which view to render or where to redirect.

## 10. What is a Route?

A route connects a URL and an HTTP method to a controller function.
From `routes/authRoutes.js`:

```js
router.post('/login', authController.postLogin);
router.get('/dashboard', isAuthenticated, authController.getDashboard);
```

So when the browser asks for `GET /dashboard`, Express knows which code to run.

## 11. What is Middleware?

Middleware is a function that runs **between** the incoming request and the final
controller. It receives `(req, res, next)`. It can:

- do something (log, check the session, parse the body),
- then call `next()` to continue,
- or stop the request (for example redirect).

Our middleware: `logger.js` (logs every request), `authMiddleware.js` (protects pages),
`flash.js` (one-time messages), plus Express built-ins like `express.urlencoded()`,
`express.static()` and `express-session`.

## 12. Why is authentication middleware needed?

Because otherwise anybody could open `/dashboard` just by typing the URL.
The middleware runs **before** the controller and checks whether the session contains a
logged-in user. If it does, it calls `next()`; if not, it redirects to `/login`.
Writing it once and reusing it on every private route avoids repeating the same check.

```js
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  req.session.flash = { type: 'error', message: 'Please login to access this page.' };
  return req.session.save(() => res.redirect('/login'));
}
```

## 13. How does registration work?

1. The user opens `GET /register` and fills Name, Email, Password, Confirm Password.
2. The browser sends `POST /register`.
3. `express.urlencoded()` turns the form into `req.body`.
4. `authController.postRegister` validates everything on the server
   (required fields, email format, password length, password match).
5. It calls `User.findOne({ email })` to check whether the email already exists.
6. If it is free, `User.create({...})` is called. The `pre('save')` hook in the model
   hashes the password with bcrypt.
7. MongoDB stores the user with a `createdAt` date.
8. The user is redirected to `/login` with the message "Registration successful".

## 14. How does login work?

1. The user submits `POST /login` with email and password.
2. The controller finds the user: `User.findOne({ email })`.
3. It compares the typed password with the stored hash: `bcrypt.compare(...)`.
4. If either the user does not exist or the password is wrong, the same generic error
   "Invalid email or password" is shown.
5. If it is correct, the session is regenerated and `req.session.userId` and
   `req.session.user` (id, name, email — **no password**) are stored.
6. The browser receives a session cookie called `sid` and is redirected to `/dashboard`.

## 15. Why do we hash passwords?

Because if the database is ever stolen or leaked, plain-text passwords would give the
attacker direct access to every account (and to other sites where people reuse passwords).
A hash is a **one-way** transformation: you cannot turn the hash back into the password.
We never need the original password — at login we simply hash the typed password again and
compare.

## 16. What is bcrypt?

bcrypt is a password-hashing algorithm designed to be **slow** and to use a random
**salt** for every password. Slow hashing makes brute-force attacks expensive, and the salt
makes sure two users with the same password get different hashes.
We use the pure-JavaScript version `bcryptjs`, with 10 salt rounds.

```js
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);
```

A stored hash looks like `$2a$10$N9qo8uLOickgx2ZMRZo...`.

## 17. What is an Express Session?

HTTP is **stateless** — the server forgets you after every request. A session solves this:

1. After a successful login the server creates a session object on the server side.
2. It sends the browser a cookie containing only the **session id** (`sid`).
3. On every later request the browser sends that cookie back, and `express-session`
   loads the matching session, so `req.session.userId` is available again.

In this project the sessions are saved in MongoDB with `connect-mongo`, so they survive a
server restart and also work on Vercel where each request may run on a different machine.

## 18. Why are protected routes needed?

Dashboard and Profile show personal information. If they were public, anyone could read
another person's data simply by visiting the URL. Protecting them enforces the rule
"only logged-in users may see this", which is the whole point of authentication.

## 19. Why do we use `.env`?

`.env` holds configuration that changes between computers and must stay secret:
the MongoDB connection string (which contains a username and password) and the session
secret. Keeping them out of the code means we can deploy the same code with different
values, and we never accidentally publish our credentials. `dotenv` loads the file into
`process.env`.

## 20. Why is `.env` added to `.gitignore`?

Because everything in a GitHub repository can be seen (and searched) by others.
If `.env` were committed, our database username and password would be public and anyone
could read or delete our data. `.gitignore` tells Git to skip the file. We commit
`.env.example` instead, which shows the variable **names** with empty values.

## 21. How does MongoDB store the user?

As a BSON/JSON-like document inside the `users` collection:

```json
{
  "_id": ObjectId("66c1f0a8e13b2a4f9c8d1234"),
  "name": "Ali Khan",
  "email": "ali@example.com",
  "password": "$2a$10$Xy7...hashed...",
  "createdAt": ISODate("2026-08-18T10:15:32.000Z")
}
```

`_id` is generated automatically by MongoDB and is the unique identifier we keep in the
session.

## 22. Explain Browser → Express → Middleware → Controller → Model → MongoDB

- **Browser** — the user clicks a link or submits a form, so an HTTP request is sent.
- **Express** — receives the request and matches it against the routes in `authRoutes.js`.
- **Middleware** — body parser, session, logger and `isAuthenticated` run first; each one
  either passes control on with `next()` or stops the request.
- **Controller** — the matched function in `authController.js` runs the business logic.
- **Model** — the controller calls `User.findOne()` / `User.create()`.
- **MongoDB** — actually stores or returns the data.
- The answer travels back: MongoDB → Model → Controller → **View (EJS)** → HTML → Browser.

## 23. Explain what happens when `/dashboard` is requested

1. Browser sends `GET /dashboard` together with the `sid` cookie.
2. `express.static` does not match, so the request continues.
3. `express-session` reads the cookie, loads the session from MongoDB and fills
   `req.session`.
4. The route `router.get('/dashboard', isAuthenticated, getDashboard)` is matched.
5. `isAuthenticated` checks `req.session.userId`.
   - Missing → a flash message is stored and the user is redirected to `/login`;
     the controller never runs.
   - Present → `next()` is called.
6. `getDashboard` calls `User.findById(req.session.userId)` — the Model reads MongoDB.
7. The controller renders `views/dashboard.ejs` with that user.
8. EJS produces the final HTML and Express sends it back with status 200.

## 24. Explain what happens when the user logs out

1. The user clicks **Logout**, which submits `POST /logout` (a form, not a link, because
   logging out changes state and should not happen through a simple GET).
2. `authController.postLogout` calls `req.session.destroy()`, which deletes the session
   document from the `sessions` collection in MongoDB.
3. `res.clearCookie('sid')` removes the cookie from the browser.
4. The user is redirected to `/login?loggedout=1` and sees
   "You have been logged out successfully."
5. If the user now types `/dashboard`, `isAuthenticated` finds no session and redirects
   back to `/login` — the old cookie is useless because the session no longer exists.

---

## Extra questions the examiner may ask

**Why `POST /logout` and not `GET /logout`?**
GET requests should not change server state and can be triggered by a browser prefetch or
an `<img>` tag. Logging out changes state, so it uses POST.

**What is `next()`?**
It hands control to the next middleware or the route handler. Without calling it (and
without sending a response) the request would hang.

**What does `express.urlencoded({ extended: true })` do?**
It parses HTML form data from the request body into the `req.body` object.

**What is `res.render()`?**
It takes an EJS view plus a data object, produces HTML, and sends it to the browser.

**What is the difference between `res.render` and `res.redirect`?**
`render` returns HTML for the current URL. `redirect` sends a 302 status and a `Location`
header telling the browser to request a different URL.

**Why is the session id regenerated after login?**
To prevent *session fixation*: an attacker who knows the visitor's pre-login session id
would otherwise still hold a valid id after the victim logs in.

**Why store sessions in MongoDB instead of memory?**
The default MemoryStore loses all logins when the server restarts and does not work when
several server instances run at the same time (which is exactly what happens on Vercel).

**What happens if two users register with the same email at the same time?**
The `unique: true` index on `email` makes MongoDB reject the second insert with error code
`11000`, and the controller turns that into the message "An account with this email
already exists".

**Where is validation done and why?**
On the server, in `authController.js` and in the Mongoose schema. Client-side JavaScript
can be disabled or bypassed, so it is only used for convenience (show/hide password and a
live "passwords match" hint).
