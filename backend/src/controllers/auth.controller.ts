import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword, buatToken } from "../utils/security";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function register(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username dan password wajib diisi" });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });
  if (existingUser) {
    return res.status(409).json({ message: "Username sudah dipakai" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username: cleanUsername, passwordHash },
  });

  return res
    .status(201)
    .json({ id: user.id, username: user.username, createdAt: user.createdAt });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username dan password wajib diisi" });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Username atau password salah" });
  }

  const { token, expires_in } = buatToken(user.id, user.username);
  return res.json({
    access_token: token,
    token_type: "bearer",
    expires_in,
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
  });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, username: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
  return res.json(user);
}
