const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const {
  saveRedirectUrl,
  authLimiter,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware.js");

const userController = require("../controllers/users.js");

// Signup
router
  .route("/signup")
  .get(userController.renderSignup)
  .post(
    authLimiter,
    validateSignup,
    wrapAsync(userController.signup)
  );

// Login & Logout
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    authLimiter,
    saveRedirectUrl,
    validateLogin,
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
    }),
    userController.login
  );

router.get("/logout", userController.logout);

// Email Verification
router.get("/verify-notice", userController.renderVerifyNotice);
router.get("/verify-email", wrapAsync(userController.verifyEmail));
router
  .route("/resend-verification")
  .get(userController.renderResendVerification)
  .post(
    authLimiter,
    wrapAsync(userController.resendVerification)
  );

// Password Reset
router
  .route("/forgot-password")
  .get(userController.renderForgotPassword)
  .post(
    authLimiter,
    validateForgotPassword,
    wrapAsync(userController.forgotPassword)
  );

router
  .route("/reset-password")
  .get(wrapAsync(userController.renderResetPassword))
  .post(
    authLimiter,
    validateResetPassword,
    wrapAsync(userController.resetPassword)
  );

// Google OAuth (Optional)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (req, res) => {
      req.flash("success", `Welcome to CareConnect, ${req.user.username}!`);
      res.redirect("/listings");
    }
  );
}

module.exports = router;
