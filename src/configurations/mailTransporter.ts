import { createTransport } from "nodemailer";
import env from "./environment";

const Transporter = createTransport({
  service: "gmail",
  auth: {
    user: env.email_app,
    pass: env.email_password,
  },
});

export default Transporter;
