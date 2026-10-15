import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: any[];
}

export interface SendOnboardingEmailParams {
  toEmail: string;
  tenantName: string;
  onboardingUrl: string;
  token: string;
  roomNumber?: string;
  propertyLocation?: string;
}

export interface SendInvoiceEmailParams {
  toEmail: string;
  tenantName: string;
  invoiceId: string;
  amount: number | string;
  dueDate: string;
  description?: string;
  portalUrl?: string;
}

export interface SendTicketEmailParams {
  toEmail: string;
  tenantName: string;
  ticketId: string;
  subject: string;
  status: string;
  updateNotes?: string;
  portalUrl?: string;
}

export interface EmailTransportInfo {
  transporter: nodemailer.Transporter;
  type: 'gmail' | 'smtp';
  fromEmail: string;
  user: string;
}

/**
 * Creates the Nodemailer transporter based on available environment variables.
 * Prioritizes GOOGLE_APP_PASSWORD for direct Gmail SMTP authentication.
 * Throws if no valid email credentials are configured.
 */
export function getEmailTransporterInfo(): EmailTransportInfo {
  const googleAppPassword = process.env.GOOGLE_APP_PASSWORD
    ? process.env.GOOGLE_APP_PASSWORD.replace(/\s+/g, '')
    : undefined;

  const emailUser =
    process.env.GOOGLE_EMAIL ||
    process.env.GOOGLE_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    '';

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  const fromEmail = process.env.SMTP_FROM || `"Seven Rocks Co-Living" <${emailUser}>`;

  // 1. Gmail Transport via Google App Password
  if (googleAppPassword && emailUser) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: googleAppPassword,
      },
    });

    return { transporter, type: 'gmail', fromEmail, user: emailUser };
  }

  // 2. Standard SMTP Transport
  if (smtpHost && emailUser && (smtpPass || googleAppPassword)) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: emailUser,
        pass: smtpPass || googleAppPassword,
      },
    });

    return { transporter, type: 'smtp', fromEmail, user: emailUser };
  }

  // No valid credentials — fail explicitly
  throw new Error(
    'Email transport not configured. Set GOOGLE_EMAIL + GOOGLE_APP_PASSWORD (or SMTP_HOST + SMTP_USER + SMTP_PASS) in .env.local.'
  );
}

/**
 * Generic email sender with comprehensive logging and error handling.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  attachments,
}: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const { transporter, type, fromEmail, user } = getEmailTransporterInfo();
  const activeFrom = from || fromEmail;
  const toRecipient = Array.isArray(to) ? to.join(', ') : to;

  console.log(`📧 [EMAIL] ${type.toUpperCase()} | To: ${toRecipient} | Subject: ${subject} | From: ${user}`);

  try {
    const info = await transporter.sendMail({
      from: activeFrom,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
      replyTo: replyTo || fromEmail,
      attachments,
    });

    console.log(`✅ [EMAIL] Delivered. Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('❌ [EMAIL] Delivery failed:', error.message);

    return {
      success: false,
      error: error.message || 'Email delivery failed',
    };
  }
}

/**
 * Sends a branded resident onboarding invitation email.
 */
export async function sendTenantOnboardingEmail({
  toEmail,
  tenantName,
  onboardingUrl,
  token,
  roomNumber,
  propertyLocation,
}: SendOnboardingEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `Welcome to Seven Rocks! Set up your resident account`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04); }
          .brand { font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
          h2 { color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; }
          p { font-size: 15px; line-height: 1.6; color: #475569; margin: 12px 0; }
          .highlight-box { background: #f8fafc; border-left: 4px solid #059669; border-radius: 6px; padding: 14px 18px; margin: 20px 0; }
          .highlight-box div { font-size: 13px; color: #334155; margin: 4px 0; }
          .highlight-box strong { color: #0f172a; }
          .btn-container { margin: 28px 0; text-align: center; }
          .btn { background-color: #059669; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
          .link-box { background: #f8fafc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; word-break: break-all; margin-top: 16px; border: 1px solid #cbd5e1; }
          .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">Seven Rocks Co-Living</div>
          <h2>Welcome, ${tenantName}!</h2>
          <p>Your resident profile has been created. To activate your account and access your personal Resident Portal, please set your password by clicking the button below:</p>
          
          ${roomNumber || propertyLocation ? `
          <div class="highlight-box">
            ${roomNumber ? `<div><strong>Assigned Room:</strong> ${roomNumber}</div>` : ''}
            ${propertyLocation ? `<div><strong>Property:</strong> ${propertyLocation}</div>` : ''}
            <div><strong>Access Token:</strong> <span style="font-family: monospace;">${token}</span></div>
          </div>
          ` : ''}

          <div class="btn-container">
            <a href="${onboardingUrl}" class="btn" target="_blank">Complete Account Setup & Set Password</a>
          </div>

          <p style="font-size: 13px;">Or copy and paste this link into your web browser:</p>
          <div class="link-box">${onboardingUrl}</div>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            <em>Note: This invitation link is valid for 7 days. If you experience any issues, please contact your building administration team.</em>
          </p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Seven Rocks Property Management. All rights reserved.<br>
            Seven Rocks Co-Living • Vienna & Berlin
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `Welcome ${tenantName},\n\nYour resident profile has been created at Seven Rocks Co-Living.\n\nPlease complete your account setup and choose your password by visiting the following link:\n\n${onboardingUrl}\n\nThis onboarding link is valid for 7 days.\n\n— Seven Rocks Co-Living Team`;

  return sendEmail({
    to: toEmail,
    subject,
    html: htmlContent,
    text: textContent,
  });
}

/**
 * Sends an invoice payment notification email to a resident.
 */
export async function sendInvoiceNotificationEmail({
  toEmail,
  tenantName,
  invoiceId,
  amount,
  dueDate,
  description,
  portalUrl,
}: SendInvoiceEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedAmount = typeof amount === 'number' ? `€${amount.toFixed(2)}` : amount;
  const subject = `Seven Rocks Invoice ${invoiceId}: ${formattedAmount} due on ${dueDate}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
          .brand { font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 20px; text-transform: uppercase; }
          .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; }
          .btn { background-color: #059669; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; }
          .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">Seven Rocks Co-Living</div>
          <h2>Invoice Notification</h2>
          <p>Dear ${tenantName},</p>
          <p>A new invoice has been generated for your stay at Seven Rocks:</p>
          <div class="invoice-box">
            <p style="margin: 4px 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
            <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${formattedAmount}</p>
            <p style="margin: 4px 0;"><strong>Due Date:</strong> ${dueDate}</p>
            ${description ? `<p style="margin: 4px 0;"><strong>Description:</strong> ${description}</p>` : ''}
          </div>
          ${portalUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="btn" target="_blank">View Invoice in Resident Portal</a>
          </div>
          ` : ''}
          <div class="footer">
            &copy; ${new Date().getFullYear()} Seven Rocks Property Management.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Tests transport connection and returns configuration diagnostics.
 */
export async function verifyEmailTransport(): Promise<{
  type: 'gmail' | 'smtp';
  verified: boolean;
  user: string;
  error?: string;
}> {
  const { transporter, type, user } = getEmailTransporterInfo();

  try {
    await transporter.verify();
    return { type, verified: true, user };
  } catch (err: any) {
    return {
      type,
      verified: false,
      user,
      error: err.message || 'SMTP Connection Verification Failed',
    };
  }
}

/**
 * Sends a maintenance ticket update email to a resident.
 */
export async function sendTicketUpdateEmail({
  toEmail,
  tenantName,
  ticketId,
  subject,
  status,
  updateNotes,
  portalUrl,
}: SendTicketEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailSubject = `Update on your maintenance ticket ${ticketId}: ${subject}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
          .brand { font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 20px; text-transform: uppercase; }
          .ticket-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; }
          .btn { background-color: #059669; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; }
          .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">Seven Rocks Co-Living</div>
          <h2>Ticket Update</h2>
          <p>Dear ${tenantName},</p>
          <p>There is an update on your maintenance request:</p>
          <div class="ticket-box">
            <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${status}</p>
            ${updateNotes ? `<p style="margin: 4px 0;"><strong>Update Notes:</strong> ${updateNotes}</p>` : ''}
          </div>
          ${portalUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="btn" target="_blank">View Ticket in Resident Portal</a>
          </div>
          ` : ''}
          <div class="footer">
            &copy; ${new Date().getFullYear()} Seven Rocks Property Management.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: emailSubject,
    html: htmlContent,
  });
}
