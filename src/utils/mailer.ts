import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "密碼重設請求",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>密碼重設請求</h2>
        <p>您好，</p>
        <p>我們收到了您的密碼重設請求。請點擊以下連結重設您的密碼：</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        ">重設密碼</a>
        <p>此連結將在 15 分鐘後失效。</p>
        <p>如果您沒有請求重設密碼，請忽略此郵件。</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
