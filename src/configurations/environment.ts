import dotenv from "dotenv";

dotenv.config();



const environment = {
  port: parseInt(process.env.PORT || "3000", 10),
  access_token_key: process.env.ACCESS_TOKEN_KEY || "accessToken",
  refresh_token_key: process.env.REFRESH_TOKEN_KEY || "refreshToken",
  crypto_key: process.env.CRYPTO_KEY || "32charactersstring",
  db_host: process.env.DB_HOST || "",
  db_port: parseInt(process.env.DB_PORT || "3306", 10),
  db_user: process.env.DB_USER || "root",
  db_password: process.env.DB_PASSWORD || "",
  db_name: process.env.DB_NAME || "chuyendetotnghiep",
  email_app: process.env.GMAIL_APP || "your_email_address",
  email_password: process.env.GMAIL_PASSWORD || "your_email_password_app",
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloud_key: process.env.CLOUDINARY_API_KEY || "",
  cloud_secret: process.env.CLOUDINARY_API_SECRET || "",
  redis_port: process.env.REDIS_PORT,
  redis_host: process.env.REDIS_HOST,
  redis_password: process.env.REDIS_PASSWORD,
  gemini_api_key: process.env.GOOGLE_API_KEY,
};

export default environment;
