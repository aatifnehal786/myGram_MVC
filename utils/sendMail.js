// utils/sendMail.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export const sendOtpEmail = async (to, otp) => {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Instagram Clone", email: "nehalahmed05011967@gmail.com" },
        to: [{ email: to }],
        subject: "Your OTP Code",
        textContent: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
      }),
    });

    const data = await res.json();
    console.log("Brevo response:", data);
    return data;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};
