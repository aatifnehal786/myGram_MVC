import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import sgTransport from "nodemailer-sendgrid";

const transporter = nodemailer.createTransport(
  sgTransport({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

export const sendOtpEmail = async (to, otp) => {
  return transporter.sendMail({
    from: `"Instagram Clone" <no-reply@aatifnehal786`, // must be verified in SendGrid
    to,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  });
};
