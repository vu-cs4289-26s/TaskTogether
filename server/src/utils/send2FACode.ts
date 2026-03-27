import nodemailer from "nodemailer";

export async function send2FACode(email: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"TaskTogether" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your 2FA Code",
    text: `Your verification code is: ${code}`,
  });
}