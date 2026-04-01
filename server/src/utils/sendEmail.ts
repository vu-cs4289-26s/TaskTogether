export async function sendEmail(options: {
    to: string; 
    subject: string;
    html: string;
    text?: string; }) : Promise<void> {
    const nodemailer = await import("nodemailer");
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
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    });
}
