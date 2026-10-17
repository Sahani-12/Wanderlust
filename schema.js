const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(5).max(2000).required(),
    location: Joi.string().trim().min(2).max(100).required(),
    country: Joi.string().trim().min(2).max(100).required(),
    price: Joi.number().min(0).max(10000000).required(),
    image: Joi.string().allow("", null),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().trim().min(3).max(1000).required(),
  }).required(),
});

module.exports.userSignupSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required().messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username cannot exceed 50 characters",
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Please provide a valid email address",
  }),
  password: Joi.string().min(4).max(128).required().messages({
    "string.min": "Password must be at least 4 characters long",
  }),
}).unknown(true);

module.exports.userLoginSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().required(),
}).unknown(true);

module.exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
  }),
});

module.exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).max(128).required().messages({
    "string.min": "Password must be at least 6 characters long",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
  token: Joi.string().required(),
});
