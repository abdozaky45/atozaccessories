import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface EmailOptions {
  from?: string;
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

const RESEND_FROM =
  process.env.RESEND_FROM ?? 'A to Z Accessory <onboarding@resend.dev>';

/**
 * Primary delivery via Resend. If Resend fails for any reason
 * (rate limit, outage, misconfig, ...) we automatically fall back
 * to nodemailer (Gmail SMTP) so emails keep going out.
 */
export const sendEmail = async ({
  from = RESEND_FROM,
  to,
  bcc,
  subject,
  html,
  text,
  replyTo,
  headers,
}: EmailOptions): Promise<boolean> => {
  const recipients = Array.isArray(to) ? to : [to];

  // --- Primary: Resend ---
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
      ...(text && { text }),
      ...(replyTo && { replyTo }),
      ...(headers && { headers }),
    });

    if (!error) {
      return true;
    }

    console.warn(
      `[sendEmail] Resend failed (${error.name ?? 'unknown'}): ${error.message}. Falling back to nodemailer.`
    );
  } catch (err) {
    console.warn(
      `[sendEmail] Resend threw, falling back to nodemailer:`,
      err
    );
  }

  // --- Fallback: nodemailer (Gmail SMTP) ---
  try {
    return await sendWithNodemailer({
      to: recipients,
      bcc,
      subject,
      html,
      text,
      replyTo,
      headers,
    });
  } catch (err) {
    console.error('[sendEmail] Nodemailer fallback also failed:', err);
    return false;
  }
};

const sendWithNodemailer = async ({
  to,
  bcc,
  subject,
  html,
  text,
  replyTo,
  headers,
}: Omit<EmailOptions, 'from' | 'to'> & { to: string[] }): Promise<boolean> => {
  if (!process.env.EMAIL || !process.env.EMAIL_PASS) {
    throw new Error('Missing EMAIL / EMAIL_PASS for nodemailer fallback');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `A to Z Accessory <${process.env.EMAIL}>`,
    to,
    subject,
    html,
    ...(bcc && { bcc }),
    ...(text && { text }),
    ...(replyTo && { replyTo }),
    ...(headers && { headers }),
  });

  return info.accepted.length > 0;
};
