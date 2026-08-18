/**
 * models/User.js
 * ---------------------------------------------------------------
 * MODEL layer of MVC.
 *
 * Defines the shape of a "user" document inside MongoDB and all the
 * rules that MongoDB/Mongoose must enforce on that data.
 *
 * A user document looks like:
 * {
 *   _id:       ObjectId("..."),
 *   name:      "Ali Khan",
 *   email:     "ali@example.com",
 *   password:  "$2a$10$...."   <-- bcrypt HASH, never plain text
 *   createdAt: 2026-08-18T10:00:00.000Z
 * }
 * ---------------------------------------------------------------
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters long'],
      maxlength: [50, 'Name cannot be longer than 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index -> stops duplicate accounts
      lowercase: true, // "ALI@x.com" and "ali@x.com" are the same account
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },

    createdAt: {
      type: Date,
      default: Date.now, // account creation date shown on the Profile page
    },
  },
  {
    // keeps an updatedAt field too; createdAt above is kept explicitly
    timestamps: { createdAt: false, updatedAt: true },
  }
);

/**
 * Mongoose "pre save" hook.
 * Runs automatically BEFORE a user document is saved.
 * It replaces the plain-text password with a bcrypt hash, so a plain
 * password can never reach the database - not even by mistake.
 */
userSchema.pre('save', async function (next) {
  // Only hash when the password field actually changed
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method used at login time.
 * Compares the plain password typed by the user with the stored hash.
 * bcrypt hashes the typed password with the same salt and checks equality.
 */
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

/**
 * Never send the password hash out of the model by accident
 * (for example when converting a user to JSON).
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Reuse the model if it was already compiled (important for serverless)
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
