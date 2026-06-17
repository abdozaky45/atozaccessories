import { Resend } from 'resend';

interface EmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export const sendEmail = async ({
  from = process.env.RESEND_FROM ?? 'A to Z Accessory <onboarding@resend.dev>',
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: EmailOptions): Promise<boolean> => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text && { text }),
    ...(replyTo && { replyTo }),
    ...(headers && { headers }),
  });

  return !error;
};
