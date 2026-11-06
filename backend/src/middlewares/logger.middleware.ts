import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    const status = res.statusCode;

    let color = "\x1b[32m"; // Hijau untuk sukses (2xx)
    if (status >= 400 && status < 500) color = "\x1b[33m"; // Kuning untuk client error
    if (status >= 500) color = "\x1b[31m"; // Merah untuk server error

    logger.info(
      "HTTP",
      `${req.method} ${req.originalUrl} -> ${color}${status}\x1b[0m (${duration}ms)`,
    );
  });

  next();
}
