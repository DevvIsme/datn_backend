import bcrypt from "bcrypt";

export function bcryptEncrypt(string: string) {
  const hashPassword = bcrypt.hash(string, 10);
  return hashPassword;
}

export function bcryptDecrypt(string: string, hash: string) {
  const isCorrect = bcrypt.compare(string, hash);
  return isCorrect;
}
