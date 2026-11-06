import { Router } from "express";
import { getStats } from "../controllers/stats.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authGuard, getStats);

export default router;
