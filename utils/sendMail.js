import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,       // Use 465 for secure SSL
  secure: true,    // Must be true with port 465
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Send OTP email
export const sendOtpEmail = async (to, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"Instagram Clone" <${process.env.MY_GMAIL}>`,
      to,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });
    console.log("OTP email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};
