import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(process.env.TWILLO_ACCOUNT_SID, process.env.TWILLO_AUTH_TOKEN);


export default client