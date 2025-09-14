import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MY_GMAIL,
    pass: process.env.MY_GMAIL_APP_PASSWORD,
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

