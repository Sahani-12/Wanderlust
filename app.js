if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const helmet = require("helmet");

const expressError = require("./utils/expressError.js");
const User = require("./models/user.js");
const {
  generalLimiter,
} = require("./middleware.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const isProduction = process.env.NODE_ENV === "production";
const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";
const port = process.env.PORT || 8080;

if (!process.env.ATLASDB_URL) {
  console.warn(
    "NOTICE: ATLASDB_URL is not set. Defaulting to local MongoDB: mongodb://127.0.0.1:27017/wanderlust"
  );
}

// Database Connection
main()
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

// Security Headers & Proxy
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://api.mapbox.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://api.mapbox.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://images.unsplash.com",
          "https://api.mapbox.com",
        ],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Global Rate Limiting
app.use(generalLimiter);

// View Engine & Parsers
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// Session & Cookie Configuration
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET || "default_session_secret_key_123",
  },
  touchAfter: 24 * 3600, // 24 hours lazy update
  ttl: 7 * 24 * 60 * 60, // 7 days TTL
});

store.on("error", function (err) {
  console.error("Error in Mongo Session Store:", err);
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET || "default_session_secret_key_123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport Authentication
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Optional Google OAuth 2.0 Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            const email =
              profile.emails && profile.emails[0]
                ? profile.emails[0].value
                : null;
            if (email) {
              user = await User.findOne({ email });
            }
            if (user) {
              user.googleId = profile.id;
              user.isVerified = true;
              await user.save();
            } else {
              const username =
                profile.displayName?.replace(/\s+/g, "").toLowerCase() ||
                `user_${profile.id.slice(0, 8)}`;
              user = new User({
                googleId: profile.id,
                username: username,
                email: email || `${profile.id}@google.oauth`,
                isVerified: true,
              });
              await user.save();
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// Template Locals

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// Routes
// Singular /listing alias redirect (prevents Cannot GET /listing)
app.use("/listing", (req, res) => {
  const target = req.originalUrl.replace(/^\/listing(?=\/|$)/, "/listings");
  res.redirect(target);
});

app.get("/", (req, res) => {
  res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Error Handling
// 404 Catch-All Handler
app.use((req, res, next) => {
  next(new expressError(404, "Page Not Found"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Handle Multer Upload Errors
  if (err.name === "MulterError") {
    req.flash("error", `File upload error: ${err.message}`);
    return res.status(400).redirect(req.headers.referer || "/listings");
  }

  const { statusCode = 500 } = err;
  let message = err.message || "Something went wrong";

  if (isProduction && statusCode === 500) {
    message = "An unexpected server error occurred. Please try again later.";
  }

  res.status(statusCode).render("error.ejs", {
    err: {
      statusCode,
      message,
      stack: isProduction ? null : err.stack,
    },
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
