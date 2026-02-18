import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendOrderEmail(
  to: string,
  subject: string,
  html: string,
) {
  await transporter.sendMail({
    from: `"Phone Store" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}
