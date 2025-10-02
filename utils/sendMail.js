import Resend from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (to, otp) => {
  await resend.emails.send({
    from: "Instagram Clone <no-reply@yourdomain.com>",
    to,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  });
};
