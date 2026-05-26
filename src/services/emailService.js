const nodemailer = require('nodemailer');

/**
 * Professional Email Service for SaaS Notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Dynamically retrieve or initialize SMTP transporter
   */
  async getTransporter() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;

    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: user,
          pass: process.env.SMTP_PASS || '',
        },
      });
      return this.transporter;
    }

    // Dynamic Ethereal test account creation for zero-config development
    console.log('[EMAIL SERVICE] ⏳ No custom SMTP settings in environment. Creating dynamic Ethereal test account...');
    try {
      const account = await nodemailer.createTestAccount();
      console.log(`[EMAIL SERVICE] 🌐 Ethereal SMTP account created successfully: ${account.user}`);
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass
        }
      });
      return this.transporter;
    } catch (err) {
      console.error('[EMAIL SERVICE] Failed to create dynamic Ethereal account, falling back to simulator:', err);
      // Return a simulated mock transporter that logs instead of throwing
      this.transporter = {
        sendMail: async (options) => {
          console.log(`[SIMULATED EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}`);
          return { messageId: 'simulated-id' };
        }
      };
      return this.transporter;
    }
  }

  /**
   * Send Request Received Acknowledgement Email
   */
  async sendRequestReceived(email, hotelName) {
    const mailOptions = {
      from: '"AutoPilot System" <noreply@autopilot.ai>',
      to: email,
      subject: `We've Received Your Request: ${hotelName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #6D4AFF;">AutoPilot Onboarding</h2>
          <p>Hello,</p>
          <p>Thank you for submitting your hotel setup request for <strong>${hotelName}</strong>.</p>
          <p>Our onboarding team has received your request and is currently reviewing your property setup configuration. We will assign a dedicated Hospitality Onboarding Specialist and send your secure workspace access link shortly.</p>
          <p>If you have any questions in the meantime, please feel free to reply directly to this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #999;">&copy; 2026 AutoPilot AI. All rights reserved.</p>
        </div>
      `,
    };

    try {
      console.log(`[EMAIL DISPATCH] Request acknowledgement sent to ${email}`);
      const transporter = await this.getTransporter();
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Request Acknowledgement Email Error:', error);
      return false;
    }
  }

  /**
   * Send Onboarding Invitation Email
   */
  async sendOnboardingInvite(email, hotelName, token) {
    const onboardingUrl = `http://localhost:5173/onboarding/${token}`;
    
    const mailOptions = {
      from: '"AutoPilot Onboarding" <onboarding@autopilot.ai>',
      to: email,
      subject: `Welcome to AutoPilot — Onboarding for ${hotelName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #6D4AFF;">Welcome to AutoPilot</h2>
          <p>Hello,</p>
          <p>Your onboarding request for <strong>${hotelName}</strong> has been approved! We are excited to help you automate your guest communications.</p>
          <p>To get started, please use the secure link below to submit your Property Management System (PMS) and communication channel credentials.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${onboardingUrl}" style="background-color: #6D4AFF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Complete Your Setup</a>
          </div>
          <p style="font-size: 12px; color: #666;">This link is secure and will expire in 7 days. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #999;">&copy; 2026 AutoPilot AI. All rights reserved.</p>
        </div>
      `,
    };

    try {
      console.log(`[EMAIL DISPATCH] Invitation sent to ${email}. URL: ${onboardingUrl}`);
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      if (transporter.options && transporter.options.host && transporter.options.host.includes('ethereal.email')) {
        console.log(`[ETHEREAL PREVIEW] ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (error) {
      console.error('Email Dispatch Error:', error);
      return false;
    }
  }

  /**
   * Send Activation Success Email
   */
  async sendActivationSuccess(email, hotelName, credentials) {
    const loginUrl = `http://localhost:5173/login`;
    
    const mailOptions = {
      from: '"AutoPilot System" <noreply@autopilot.ai>',
      to: email,
      subject: `Workspace Activated: ${hotelName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10B981;">Workspace Live</h2>
          <p>Congratulations!</p>
          <p>The AI Automation environment for <strong>${hotelName}</strong> is now live and operational.</p>
          <p>Your administrative credentials are provided below. Please login and change your password immediately.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>Dashboard URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Admin User:</strong> ${email}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Temporary Password:</strong> <span style="color: #6D4AFF; font-family: monospace;">${credentials.password}</span></p>
          </div>
          <p>Our team is monitoring your integration sync nodes to ensure 100% stability.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #999;">&copy; 2026 AutoPilot AI. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Activation Email Error:', error);
      return false;
    }
  }

  /**
   * Send New Onboarding Discussion Message Email
   */
  async sendOnboardingMessage(email, hotelName, sender, text, token) {
    const onboardingUrl = token ? `http://localhost:5173/onboarding/${token}` : 'http://localhost:5173';
    
    const mailOptions = {
      from: '"AutoPilot Onboarding" <onboarding@autopilot.ai>',
      to: email,
      subject: `New Onboarding Message for ${hotelName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #6D4AFF; font-size: 18px;">New Message from AutoPilot Support</h2>
          <p>Hello,</p>
          <p>You have received a new message regarding your onboarding for <strong>${hotelName}</strong> from <strong>${sender}</strong>:</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6D4AFF;">
            <p style="margin: 0; font-size: 14px; font-style: italic; color: #333;">"${text}"</p>
          </div>
          <p>To reply directly to this message or view the discussion thread, please click the secure link below:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${onboardingUrl}" style="background-color: #6D4AFF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block;">Reply to Message</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #999;">&copy; 2026 AutoPilot AI. All rights reserved.</p>
        </div>
      `,
    };

    try {
      console.log(`[EMAIL DISPATCH] Onboarding message notification sent to ${email}`);
      const transporter = await this.getTransporter();
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Discussion Message Email Error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
