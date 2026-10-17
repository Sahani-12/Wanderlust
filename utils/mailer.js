const nodemailer = require("nodemailer");

// Nodemailer Transporter
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
};

// Send Email with dev fallback
const sendMail = async ({ to, subject, html, text }) => {
  const from = process.env.SMTP_FROM || '"CareConnect" <no-reply@careconnect.com>';
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[Mailer] SMTP not configured. Simulated email to: ${to} | Subject: "${subject}"`
    );
    if (text) console.log(`[Mailer Body]:\n${text}`);
    return { simulated: true };
  }

  return await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

// Send Email Verification Link
const sendVerificationEmail = async ({ to, username, verificationUrl }) => {
  const subject = "Verify Your CareConnect Account";
  const text = `Hi ${username},\n\nThank you for signing up for CareConnect! Please verify your email by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe CareConnect Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .header { background-color: #fe424d; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
          .content { padding: 32px 24px; color: #333333; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #fe424d; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
          .footer { padding: 20px; background-color: #f1f3f5; text-align: center; font-size: 12px; color: #777777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to CareConnect!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>Thank you for creating an account with CareConnect. To unlock full access to creating listings, booking stays, and sharing reviews, please verify your email address:</p>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
            </div>
            <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:<br><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p style="font-size: 13px; color: #888;">This link will expire in 24 hours. If you did not create this account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} CareConnect Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendMail({ to, subject, html, text });
};

// Send Password Reset Link
const sendPasswordResetEmail = async ({ to, username, resetUrl }) => {
  const subject = "Reset Your CareConnect Password";
  const text = `Hi ${username},\n\nYou requested a password reset for your CareConnect account. Please click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour and can only be used once.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nBest regards,\nThe CareConnect Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .header { background-color: #222222; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: bold; }
          .content { padding: 32px 24px; color: #333333; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #fe424d; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
          .footer { padding: 20px; background-color: #f1f3f5; text-align: center; font-size: 12px; color: #777777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>We received a request to reset the password for your CareConnect account. Click the button below to choose a new password:</p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:<br><a href="${resetUrl}">${resetUrl}</a></p>
            <p style="font-size: 13px; color: #888;">This link will expire in <strong>1 hour</strong> and can only be used once. If you did not request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} CareConnect Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendMail({ to, subject, html, text });
};

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
