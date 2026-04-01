import {sendEmail} from "./sendEmail";

export async function send2FACode(email: string, code: string) {
  sendEmail({
    to: email,
    subject: "Your 2FA Code",
    html: `<p>Your verification code is: <strong>${code}</strong></p>`,
  });
}