import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
   service: "gmail",
  auth: {
    user: process.env.MY_GMAIL,          // e.g. your_email@gmail.com
    pass: process.env.GMAIL_APP_PASS,    // 16-digit app password
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
