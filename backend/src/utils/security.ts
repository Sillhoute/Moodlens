import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-ganti-di-produksi-minimal-32-karakter";
const JWT_EXPIRE_MINUTES = parseInt(
  process.env.JWT_EXPIRE_MINUTES || "480",
  10,
);

export interface TokenPayload {
  userId: number;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function buatToken(
  userId: number,
  username: string,
): { token: string; expires_in: number } {
  const expiresIn = JWT_EXPIRE_MINUTES * 60;
  const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn });
  return { token, expires_in: expiresIn };
}

export function verifikasiToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
