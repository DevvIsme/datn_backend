import jwt from "jsonwebtoken";
import env from "../configurations/environment";

export const tokenGenerate = (payload: any, type: "access" | "refresh") => {
  const expiresIn = type == "access" ? "24h" : "24h";
  const key = type == "access" ? env.access_token_key : env.refresh_token_key;
  return jwt.sign(payload, key, { expiresIn });
};

export const tokenVerify = async (
  token: string,
  type: "access" | "refresh"
) => {
  try {
    const key = type == "access" ? env.access_token_key : env.refresh_token_key;
    const decoded = jwt.verify(token, key);
    if (typeof decoded === "object" && decoded !== null) {
      const { exp, iat, ...rest } = decoded;
      return { ...rest };
    } else {
      throw new Error("Decoded token is not an object");
    }
  } catch (err) {
    throw err;
  }
};
