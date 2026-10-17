const crypto = require("crypto");
const User = require("../models/user");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/mailer");

module.exports.renderSignup = (req, res) => {
  res.render("users/signup.ejs");
};

// Signup
module.exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Generate crypto verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const newUser = new User({
      email,
      username,
      isVerified: true,
      verificationToken: hashedToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    const registeredUser = await User.register(newUser, password);

    // Send verification email safely without blocking signup
    try {
      const baseUrl =
        process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;
      await sendVerificationEmail({
        to: email,
        username,
        verificationUrl,
      });
    } catch (mailErr) {
      console.warn("[Mailer] Could not send verification email:", mailErr.message);
    }

    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", `Welcome to CareConnect, ${username}!`);
      res.redirect("/listings");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.renderVerifyNotice = (req, res) => {
  res.render("users/verifyNotice.ejs");
};

// Verify Email
module.exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    req.flash("error", "Verification token is missing.");
    return res.redirect("/login");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "Verification link is invalid or has expired. Please request a new one."
    );
    return res.redirect("/resend-verification");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  req.flash(
    "success",
    "Your email has been verified successfully! You now have full access to CareConnect."
  );
  res.redirect(req.isAuthenticated() ? "/listings" : "/login");
};

module.exports.renderResendVerification = (req, res) => {
  res.render("users/resendVerification.ejs");
};

// Resend Verification
module.exports.resendVerification = async (req, res) => {
  const email = (req.body.email || (req.user && req.user.email) || "").trim().toLowerCase();

  if (!email) {
    req.flash("error", "Please provide a valid email address.");
    return res.redirect("/resend-verification");
  }

  const user = await User.findOne({ email });

  if (user && !user.isVerified) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.verificationToken = hashedToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const baseUrl =
      process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;
    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      verificationUrl,
    });
  }

  req.flash(
    "success",
    "If an unverified account with that email exists, a new verification link has been sent."
  );
  res.redirect("/login");
};

module.exports.renderLoginForm = (req, res) => {
  res.render("users/login.ejs");
};

// Login
module.exports.login = async (req, res) => {
  req.flash("success", `Welcome back to CareConnect, ${req.user.username}!`);
  const redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

module.exports.renderForgotPassword = (req, res) => {
  res.render("users/forgotPassword.ejs");
};

// Forgot Password
module.exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour expiry
    await user.save();

    const baseUrl =
      process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      resetUrl,
    });
  }

  // Consistent generic flash to prevent email enumeration attacks
  req.flash(
    "success",
    "If an account with that email exists, a password reset link has been sent."
  );
  res.redirect("/login");
};

module.exports.renderResetPassword = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    req.flash("error", "Password reset token is missing.");
    return res.redirect("/forgot-password");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "Password reset token is invalid or has expired. Please request a new one."
    );
    return res.redirect("/forgot-password");
  }

  res.render("users/resetPassword.ejs", { token });
};

// Reset Password
module.exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "Password reset token is invalid or has expired."
    );
    return res.redirect("/forgot-password");
  }

  // Reset password via passport-local-mongoose
  await user.setPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.flash(
    "success",
    "Password has been reset successfully! You can now log in with your new password."
  );
  res.redirect("/login");
};

// Logout
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have been logged out.");
    res.redirect("/listings");
  });
};
