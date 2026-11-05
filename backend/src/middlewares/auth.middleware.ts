import { Request, Response, NextFunction } from "express";
import { verifikasiToken, TokenPayload } from "../utils/security";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  file?: Express.Multer.File;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
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

/**
 * Optional Auth: Memeriksa token jika disertakan (misal untuk menyimpan riwayat),
 * namun mengizinkan akses anonim (Guest) tanpa melempar error 401.
 */
export function optionalAuthGuard(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const payload = verifikasiToken(token);
      req.user = payload;
    } catch {
      // Token tidak valid/kedaluwarsa, tetapi izinkan lanjut sebagai Guest (req.user = undefined)
    }
  }
  next();
}
