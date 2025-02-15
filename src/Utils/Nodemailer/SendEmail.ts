import nodemailer, { SentMessageInfo } from 'nodemailer';

interface EmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async ({
  from = process.env.EMAIL,
  to,
  subject,
  html,
}: EmailOptions): Promise<boolean> => {
  const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info: SentMessageInfo = await transporter.sendMail({
    from: `a.to.zaccessories <${from}>`,
    to,
    subject,
    text: 'your login code',
    html,
  });

  return info.accepted.length < 1 ? false : true;
};
