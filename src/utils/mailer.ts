import nodemailer from "nodemailer";

export const sendResetPasswordEmail = async (to: string, resetUrl: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: "密碼重設連結",
    text: `請點擊以下連結重設密碼：${resetUrl}`,
  });
};
