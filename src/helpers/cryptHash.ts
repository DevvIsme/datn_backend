import crypto from "crypto";
import env from "../configurations/environment";

const key = env.crypto_key;

const encryptString = (data: any) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key),
    Buffer.from(key).slice(0, 16)
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decryptString = (encryptedText: any) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf-8"),
    Buffer.from(key.slice(0, 16), "utf-8") 
  );

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
};

export { encryptString, decryptString };
