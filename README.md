# CareConnect 🏡

CareConnect is a production-grade, full-stack rental marketplace built with Node.js, Express 5, MongoDB, and EJS following MVC architecture.

---

## 🚀 Status & Current Phase

### ✅ Phase 1: Security and Auth Hardening (COMPLETED)
- **Helmet Security Headers & Strict CSP**: Configured Content-Security-Policy supporting Mapbox GL JS/APIs, Cloudinary, Bootstrap CDN, FontAwesome, Google Fonts, and secure workers.
- **Rate Limiting**:
  - Global rate limiter (300 requests / 15 min per IP).
  - Strict auth limiter (10 requests / 15 min per IP) on `/login`, `/signup`, `/forgot-password`, `/reset-password`, and `/resend-verification`.
- **Session & Cookie Hardening**:
  - `httpOnly: true`, `sameSite: "lax"`, dynamic `secure: isProduction`.
  - Fixed MongoStore crypto configuration typo, enabled 7-day TTL and lazy touch updates.
  - Placed `app.set("trust proxy", 1)` ahead of session store for proper reverse proxy handling on Render.
- **Email Verification Flow**:
  - SHA-256 hashed single-use tokens with 24-hour expiration.
  - Unverified users are restricted via `isVerified` middleware from creating listings and reviews.
  - Resend verification page and persistent notice banner for unverified accounts.
- **Password Reset Flow**:
  - Single-use hashed tokens with 1-hour expiration.
  - Password reset request & confirmation forms with Joi schema validation.
- **Transactional Mailer Service (`utils/mailer.js`)**:
  - Nodemailer SMTP setup with responsive HTML email templates.
  - Safe development fallback: outputs verification and reset links to the console when SMTP credentials are not yet configured.
- **User Roles & Authorization**:
  - User model enhanced with `role: ["guest", "host", "admin"]`.
  - Added `isHost` and `isAdmin` middleware guards.
  - Review deletion UI updated to hide Delete buttons from non-authors.
- **Multer Hardening**:
  - 5 MB file size limit and strict MIME validation (`image/jpeg`, `image/png`, `image/webp`).
- **Search ReDoS Prevention**:
  - Special regex characters escaped and input capped at 50 characters.
- **Centralized Error Handling**:
  - Safe error rendering for 404, 429 (rate limits), and 500 server errors without leaking stack traces in production.

---

## 📋 Environment Variables (.env)

Copy `.env.example` to `.env` and configure:

```env
PORT=8080
NODE_ENV=development
APP_BASE_URL=http://localhost:8080

# Database
ATLASDB_URL=mongodb://127.0.0.1:27017/wanderlust

# Session Secrets
SECRET=your_super_secret_session_key

# Cloudinary
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# Mapbox
MAP_TOKEN=your_mapbox_public_token

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM="CareConnect <no-reply@careconnect.com>"

# Optional Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 🧪 How to Run and Test Phase 1

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Syntax
```bash
node --check app.js
```

### 3. Start the Server
```bash
node app.js
```

### 4. Test Key Flows
1. **Signup & Email Verification**:
   - Navigate to `http://localhost:8080/signup` and register a new user.
   - If SMTP is not set, the verification link will be printed directly in your terminal console.
   - Click the link or navigate to `/verify-email?token=...` to verify your account.
2. **Access Control**:
   - Try to create a listing (`/listings/new`) with an unverified account: you will be redirected to `/verify-notice`.
3. **Forgot & Reset Password**:
   - Visit `http://localhost:8080/forgot-password` and enter your registered email.
   - Check terminal/inbox for the reset link and complete the password change.
5. **Rate Limiting**:
   - Exceed 10 rapid submissions on `/login` to observe rate limiting in action.
6. **Search**:
   - Search for locations with special characters like `Test.*[]?` to ensure safe regex execution.
