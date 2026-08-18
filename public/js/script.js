/**
 * public/js/script.js
 * ---------------------------------------------------------------
 * Small vanilla-JavaScript improvements for the user interface ONLY.
 *
 * IMPORTANT: nothing here is a security feature. Real validation,
 * password hashing and authentication all happen on the SERVER
 * (controllers/authController.js + models/User.js). Client-side code
 * can be disabled by anyone, so it can never be trusted.
 * ---------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', function () {
  /* ---------------- 1. Show / hide password ---------------- */
  document.querySelectorAll('.toggle-password').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = document.getElementById(button.dataset.target);
      if (!input) return;

      var hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      button.textContent = hidden ? 'Hide' : 'Show';
      button.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });

  /* ------- 2. Live "passwords match" hint on registration ------- */
  var password = document.getElementById('password');
  var confirmPassword = document.getElementById('confirmPassword');
  var matchHint = document.getElementById('matchHint');

  function checkMatch() {
    if (!matchHint) return;

    if (!confirmPassword.value) {
      matchHint.textContent = '';
      matchHint.className = 'hint';
      return;
    }

    if (password.value === confirmPassword.value) {
      matchHint.textContent = 'Passwords match.';
      matchHint.className = 'hint ok';
    } else {
      matchHint.textContent = 'Passwords do not match.';
      matchHint.className = 'hint bad';
    }
  }

  if (password && confirmPassword && matchHint) {
    password.addEventListener('input', checkMatch);
    confirmPassword.addEventListener('input', checkMatch);
  }

  /* --------- 3. Prevent double submit on slow connections -------- */
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function () {
      var submitBtn = form.querySelector('button[type="submit"]');
      if (!submitBtn) return;

      // Let the browser send the form first, then disable the button
      setTimeout(function () {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
      }, 0);
    });
  });

  /* ------------- 4. Auto-hide flash messages after 6s ------------ */
  var alerts = document.querySelectorAll('.page > .alert');
  alerts.forEach(function (el) {
    setTimeout(function () {
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 400);
    }, 6000);
  });
});
