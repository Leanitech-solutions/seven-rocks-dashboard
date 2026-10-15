import { NextResponse } from 'next/server';
import { verifyEmailTransport, sendEmail } from '../../../../lib/email';

export async function GET() {
  try {
    const status = await verifyEmailTransport();
    return NextResponse.json({
      success: true,
      emailStatus: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check email status',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = body.to || process.env.GOOGLE_EMAIL || process.env.SMTP_USER;

    if (!to) {
      return NextResponse.json(
        {
          error: 'Recipient email is required (provide { "to": "email@example.com" } in request body or set GOOGLE_EMAIL)',
        },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject: 'Test Email from Seven Rocks Co-Living',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #059669;">Seven Rocks Mailer Test</h2>
          <p>This is a test email dispatched from the Seven Rocks platform via Nodemailer.</p>
          <p><strong>Status:</strong> Nodemailer email dispatch is operational!</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <small style="color: #64748b;">Dispatched at: ${new Date().toISOString()}</small>
        </div>
      `,
      text: `Seven Rocks Mailer Test\n\nThis is a test email dispatched from the Seven Rocks platform via Nodemailer.\nDispatched at: ${new Date().toISOString()}`,
    });

    return NextResponse.json({
      success: result.success,
      recipient: to,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}
