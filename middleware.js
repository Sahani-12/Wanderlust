const Listing = require("./models/listing");
const Review = require("./models/review");
const expressError = require("./utils/expressError.js");
const {
  listingSchema,
  reviewSchema,
  userSignupSchema,
  userLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./schema.js");
const rateLimit = require("express-rate-limit");

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  handler: (req, res, next) => {
    req.flash(
      "error",
      "Too many attempts from this IP. Please wait 15 minutes before trying again."
    );
    res.redirect(req.baseUrl + req.path || "/login");
  },
});

// Authentication & Authorization
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

const saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

const isVerified = (req, res, next) => {
  if (req.user && !req.user.isVerified) {
    req.flash(
      "error",
      "Please verify your email address to perform this action."
    );
    return res.redirect("/verify-notice");
  }
  next();
};

const isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }
  if (!listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the owner of this listing!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

const isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }
  if (!review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "You did not write this review!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

const isHost = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  if (req.user.role !== "host" && req.user.role !== "admin") {
    req.flash("error", "Access restricted to hosts only.");
    return res.redirect("/listings");
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  if (req.user.role !== "admin") {
    req.flash("error", "Administrator privileges required.");
    return res.redirect("/listings");
  }
  next();
};

// Input Validation (Joi)
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new expressError(400, errMsg);
  }
  next();
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new expressError(400, errMsg);
  }
  next();
};

const validateSignup = (req, res, next) => {
  const { error } = userSignupSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    req.flash("error", errMsg);
    return res.redirect("/signup");
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { error } = userLoginSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    req.flash("error", errMsg);
    return res.redirect("/login");
  }
  next();
};

const validateForgotPassword = (req, res, next) => {
  const { error } = forgotPasswordSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    req.flash("error", errMsg);
    return res.redirect("/forgot-password");
  }
  next();
};

const validateResetPassword = (req, res, next) => {
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    req.flash("error", errMsg);
    return res.redirect(`/reset-password?token=${req.body.token || ""}`);
  }
  next();
};

module.exports = {
  isLoggedIn,
  saveRedirectUrl,
  isVerified,
  isOwner,
  isReviewAuthor,
  isHost,
  isAdmin,
  validateListing,
  validateReview,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  generalLimiter,
  authLimiter,
};