import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",   // or smtp.mailtrap.io, smtp.office365.com, etc.
  port: 587,                // 465 if using secure:true
  secure: false, 
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.GMAIL_PASSWORD,
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

