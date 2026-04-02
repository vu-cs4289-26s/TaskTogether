export async function sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
}): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const from = options.from || `"TaskTogether" <${smtpUser}>`;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        console.log(`\n[TaskTogether Email]`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        if (options.text) console.log(`Body: ${options.text}`);
        console.log();
        return;
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    });
}
