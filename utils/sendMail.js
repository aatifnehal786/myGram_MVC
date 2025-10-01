import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,                  // ✅ use 465 for Gmail
  secure: true,               // ✅ must be true with port 465
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.GMAIL_PASSWORD, // must be an App Password
  },
});

export const sendOtpEmail = async (to, otp) => {
  return transporter.sendMail({
    from: `"Instagram Clone" <${process.env.MY_GMAIL}>`,
    to,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  });
};
