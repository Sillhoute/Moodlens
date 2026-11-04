import { Request, Response, NextFunction } from "express";
import { verifikasiToken, TokenPayload } from "../utils/security";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifikasiToken(token);
    req.user = payload;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Sesi login sudah berakhir, silakan login ulang" });
  }
}
